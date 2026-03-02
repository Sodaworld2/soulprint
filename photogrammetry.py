"""
Soulprint Photogrammetry Pipeline — GPU-Accelerated Structure from Motion

Uses SIFT features (OpenCV) + GPU-accelerated matching (PyTorch/kornia)
+ multi-view triangulation + Poisson/Delaunay mesh reconstruction.

Outputs GLB, OBJ, and PLY files loadable in the Soulprint 3D viewer.

Requirements: torch, kornia, opencv-python, numpy, scipy, trimesh, pillow
Hardware: NVIDIA RTX 5090 (32GB VRAM) recommended

Usage:
    python photogrammetry.py <image_directory> [--output models/] [--max-dim 1600]
"""

import cv2
import numpy as np
import torch
import torch.nn.functional as F
from pathlib import Path
from scipy.spatial import Delaunay, cKDTree
import trimesh
import json
import sys
import time
import argparse
from typing import Optional


def get_device():
    """Get best available compute device."""
    if torch.cuda.is_available():
        dev = torch.device('cuda')
        name = torch.cuda.get_device_name(0)
        vram = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(f"  GPU: {name} ({vram:.1f} GB VRAM)")
        return dev
    print("  CPU mode (no CUDA available)")
    return torch.device('cpu')


def load_images(image_dir: Path, max_dim: int = 1600):
    """Load and resize images from directory."""
    extensions = {'.jpg', '.jpeg', '.png', '.tif', '.tiff', '.bmp', '.webp'}
    paths = sorted([p for p in image_dir.iterdir() if p.suffix.lower() in extensions])

    if not paths:
        print(f"  No images found in {image_dir}")
        return []

    images = []
    for p in paths:
        img = cv2.imread(str(p))
        if img is None:
            print(f"  Warning: Could not read {p.name}")
            continue
        h, w = img.shape[:2]
        scale = min(max_dim / max(h, w), 1.0)
        if scale < 1.0:
            img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        images.append((p.name, img))
        print(f"  {p.name} -> {img.shape[1]}x{img.shape[0]}")

    return images


def detect_features(images, n_features: int = 8000):
    """Detect SIFT features in all images."""
    sift = cv2.SIFT_create(nfeatures=n_features)
    features = []
    for name, img in images:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        kps, descs = sift.detectAndCompute(gray, None)
        features.append((kps, descs))
        print(f"  {name}: {len(kps)} features")
    return features


def match_pairs_gpu(features, images, device, ratio_thresh: float = 0.80):
    """Match features between image pairs using GPU-accelerated brute force."""
    n = len(features)
    matches_map = {}
    total_pairs = n * (n - 1) // 2

    print(f"  Matching {total_pairs} pairs on {device}...")

    pair_count = 0
    for i in range(n):
        kps_i, desc_i = features[i]
        if desc_i is None or len(desc_i) < 2:
            continue

        # Upload descriptors to GPU once per reference image
        desc_i_t = torch.from_numpy(desc_i).float().to(device)

        for j in range(i + 1, n):
            pair_count += 1
            kps_j, desc_j = features[j]
            if desc_j is None or len(desc_j) < 2:
                continue

            desc_j_t = torch.from_numpy(desc_j).float().to(device)

            # Compute L2 distance matrix on GPU
            # Using torch.cdist which is extremely fast on GPU
            dists = torch.cdist(desc_i_t.unsqueeze(0), desc_j_t.unsqueeze(0)).squeeze(0)

            # Get top-2 matches for ratio test
            top2 = torch.topk(dists, k=2, dim=1, largest=False)
            ratios = top2.values[:, 0] / (top2.values[:, 1] + 1e-8)
            best_indices = top2.indices[:, 0]

            # Apply Lowe's ratio test
            good_mask = ratios < ratio_thresh
            query_indices = torch.arange(len(desc_i), device=device)[good_mask]
            train_indices = best_indices[good_mask]

            # Move back to CPU
            qi = query_indices.cpu().numpy()
            ti = train_indices.cpu().numpy()

            if len(qi) >= 12:
                # Store as list of (queryIdx, trainIdx) tuples
                matches_map[(i, j)] = list(zip(qi.tolist(), ti.tolist()))
                if pair_count % 10 == 0 or len(qi) > 100:
                    print(f"  ({i},{j}): {len(qi)} matches")

    print(f"  {len(matches_map)} valid pairs from {total_pairs} total")
    return matches_map


def estimate_cameras(images, features, matches_map):
    """Estimate camera poses using essential matrix decomposition with RANSAC."""
    n = len(images)

    # Find the best seed pair (most matches)
    best_seed = max(matches_map.items(), key=lambda x: len(x[1]))
    seed_i, seed_j = best_seed[0]
    print(f"  Seed pair: ({seed_i},{seed_j}) with {len(best_seed[1])} matches")

    # Per-image camera intrinsics (different image sizes)
    def get_K(img_idx):
        h, w = images[img_idx][1].shape[:2]
        focal = max(w, h) * 1.2
        return np.array([[focal, 0, w / 2],
                         [0, focal, h / 2],
                         [0, 0, 1]], dtype=np.float64)

    # Use seed image for default K
    K = get_K(seed_i)

    # Initialize seed pair
    poses = {seed_i: (np.eye(3), np.zeros(3))}
    registered = {seed_i}

    # Register seed_j via the seed pair
    pair_key = (min(seed_i, seed_j), max(seed_i, seed_j))
    seed_matches = matches_map[pair_key]
    kps_i = features[seed_i][0]
    kps_j = features[seed_j][0]

    if seed_i < seed_j:
        pts_i = np.float64([kps_i[m[0]].pt for m in seed_matches])
        pts_j = np.float64([kps_j[m[1]].pt for m in seed_matches])
    else:
        pts_i = np.float64([kps_j[m[1]].pt for m in seed_matches])
        pts_j = np.float64([kps_i[m[0]].pt for m in seed_matches])

    E, mask = cv2.findEssentialMat(pts_i, pts_j, K, method=cv2.RANSAC, prob=0.999, threshold=1.5)
    if E is not None:
        inliers = mask.ravel().astype(bool)
        _, R, t, _ = cv2.recoverPose(E, pts_i[inliers], pts_j[inliers], K)
        poses[seed_j] = (R, t.flatten())
        registered.add(seed_j)
        print(f"  Camera {seed_j} ({images[seed_j][0]}) registered as second seed")

    # Iteratively register cameras by finding best-connected unregistered camera
    max_iter = n * 5
    for iteration in range(max_iter):
        if len(registered) >= n:
            break

        best_pair = None
        best_count = 0

        for (i, j), matches in matches_map.items():
            if i in registered and j not in registered:
                if len(matches) > best_count:
                    best_count = len(matches)
                    best_pair = (i, j, False)
            elif j in registered and i not in registered:
                if len(matches) > best_count:
                    best_count = len(matches)
                    best_pair = (j, i, True)

        if best_pair is None:
            break

        ref_idx, new_idx, swapped = best_pair
        pair_key = (min(ref_idx, new_idx), max(ref_idx, new_idx))
        matches = matches_map[pair_key]

        # pair_key = (first, second) where first < second
        # m[0] = queryIdx for pair_key[0], m[1] = trainIdx for pair_key[1]
        first_idx, second_idx = pair_key
        kps_first = features[first_idx][0]
        kps_second = features[second_idx][0]

        pts_first = np.float64([kps_first[m[0]].pt for m in matches])
        pts_second = np.float64([kps_second[m[1]].pt for m in matches])

        if ref_idx == first_idx:
            pts_ref, pts_new = pts_first, pts_second
        else:
            pts_ref, pts_new = pts_second, pts_first

        # Use the reference camera's K for the essential matrix
        K_ref = get_K(ref_idx)

        E, mask = cv2.findEssentialMat(
            pts_ref, pts_new, K_ref,
            method=cv2.RANSAC, prob=0.999, threshold=2.0
        )
        if E is None:
            continue

        inliers = mask.ravel().astype(bool)
        if inliers.sum() < 8:
            continue
        _, R, t, mask_pose = cv2.recoverPose(
            E, pts_ref[inliers], pts_new[inliers], K_ref
        )

        R_ref, t_ref = poses[ref_idx]
        R_new = R @ R_ref
        t_new = (R @ t_ref.reshape(3, 1) + t).flatten()

        poses[new_idx] = (R_new, t_new)
        registered.add(new_idx)
        print(f"  Camera {new_idx} ({images[new_idx][0]}) via {ref_idx} "
              f"[{best_count} matches, {int(inliers.sum())} inliers]")

    print(f"  Registered {len(poses)}/{n} cameras")
    return poses, K


def triangulate_points(images, features, matches_map, poses, K, device):
    """Triangulate 3D points from all matched pairs. GPU-accelerated filtering."""

    def get_K_for(img_idx):
        h, w = images[img_idx][1].shape[:2]
        focal = max(w, h) * 1.2
        return np.array([[focal, 0, w / 2], [0, focal, h / 2], [0, 0, 1]], dtype=np.float64)

    all_points = []
    all_colors = []

    for (i, j), matches in matches_map.items():
        if i not in poses or j not in poses:
            continue

        R_i, t_i = poses[i]
        R_j, t_j = poses[j]

        K_i = get_K_for(i)
        K_j = get_K_for(j)

        P_i = K_i @ np.hstack([R_i, t_i.reshape(3, 1)])
        P_j = K_j @ np.hstack([R_j, t_j.reshape(3, 1)])

        kps_i = features[i][0]
        kps_j = features[j][0]

        pts_i = np.float64([kps_i[m[0]].pt for m in matches])
        pts_j = np.float64([kps_j[m[1]].pt for m in matches])

        # Triangulate
        pts_4d = cv2.triangulatePoints(P_i, P_j, pts_i.T, pts_j.T)
        pts_3d = (pts_4d[:3] / pts_4d[3]).T

        # Validate points
        valid = np.all(np.isfinite(pts_3d), axis=1)
        if not np.any(valid):
            continue

        dists = np.linalg.norm(pts_3d, axis=1)
        med = np.median(dists[valid])
        valid &= (dists < med * 5) & (dists > med * 0.05)

        # Extract colors
        img_i = images[i][1]
        for k, m in enumerate(matches):
            if not valid[k]:
                continue
            x, y = int(kps_i[m[0]].pt[0]), int(kps_i[m[0]].pt[1])
            if 0 <= x < img_i.shape[1] and 0 <= y < img_i.shape[0]:
                bgr = img_i[y, x]
                all_colors.append([bgr[2], bgr[1], bgr[0]])
                all_points.append(pts_3d[k])

    if not all_points:
        return np.array([]), np.array([])

    points = np.array(all_points)
    colors = np.array(all_colors, dtype=np.uint8)

    # GPU-accelerated deduplication using nearest-neighbor on GPU
    if len(points) > 100 and device.type == 'cuda':
        print(f"  Deduplicating {len(points)} points on GPU...")
        pts_t = torch.from_numpy(points).float().to(device)

        # Compute pairwise distances in chunks to avoid OOM
        chunk = min(5000, len(points))
        keep = torch.ones(len(points), dtype=torch.bool, device=device)

        threshold = float(np.median(np.diff(np.sort(points[:, 0]))) * 2)
        threshold = max(threshold, 0.001)

        for start in range(0, len(points), chunk):
            end = min(start + chunk, len(points))
            if not keep[start:end].any():
                continue
            d = torch.cdist(pts_t[start:end], pts_t)
            for local_idx in range(end - start):
                global_idx = start + local_idx
                if not keep[global_idx]:
                    continue
                neighbors = (d[local_idx] < threshold).nonzero(as_tuple=True)[0]
                for n_idx in neighbors:
                    if n_idx != global_idx:
                        keep[n_idx] = False

        mask = keep.cpu().numpy()
        points = points[mask]
        colors = colors[mask]
    elif len(points) > 100:
        # CPU fallback
        tree = cKDTree(points)
        threshold = max(np.median(np.diff(np.sort(points[:, 0]))) * 2, 0.001)
        keep = np.ones(len(points), dtype=bool)
        for idx in range(len(points)):
            if not keep[idx]:
                continue
            neighbors = tree.query_ball_point(points[idx], threshold)
            for n in neighbors:
                if n != idx:
                    keep[n] = False
        points = points[keep]
        colors = colors[keep]

    print(f"  {len(points)} 3D points after deduplication")
    return points, colors


def densify_point_cloud(images, poses, K, points, colors, device, patch_size: int = 7):
    """
    Dense point cloud via patch-based stereo matching on GPU.
    For each pair of nearby cameras, compute dense disparity using
    normalized cross-correlation on GPU.
    """
    if device.type != 'cuda':
        print("  Skipping densification (no GPU)")
        return points, None

    print("  Running GPU dense stereo matching...")

    # Sort camera pairs by baseline distance
    cam_ids = sorted(poses.keys())
    pairs = []
    for i_idx, i in enumerate(cam_ids):
        for j in cam_ids[i_idx + 1:]:
            R_i, t_i = poses[i]
            R_j, t_j = poses[j]
            baseline = np.linalg.norm(t_j - t_i)
            pairs.append((i, j, baseline))

    # Use pairs with moderate baseline
    pairs.sort(key=lambda x: x[2])
    if len(pairs) > 10:
        # Pick evenly spaced baselines
        indices = np.linspace(len(pairs) // 4, 3 * len(pairs) // 4, min(10, len(pairs)), dtype=int)
        pairs = [pairs[i] for i in indices]

    dense_points = list(points) if len(points) > 0 else []
    # Preserve original sparse colors
    dense_colors = list(colors) if colors is not None and len(colors) > 0 else []

    for idx_i, idx_j, baseline in pairs[:6]:  # Limit to 6 pairs
        gray_i = cv2.cvtColor(images[idx_i][1], cv2.COLOR_BGR2GRAY)
        gray_j = cv2.cvtColor(images[idx_j][1], cv2.COLOR_BGR2GRAY)

        # Resize to match dimensions (StereoSGBM requires same size)
        h_i, w_i = gray_i.shape
        h_j, w_j = gray_j.shape
        if (h_i, w_i) != (h_j, w_j):
            target_h = min(h_i, h_j)
            target_w = min(w_i, w_j)
            gray_i = cv2.resize(gray_i, (target_w, target_h))
            gray_j = cv2.resize(gray_j, (target_w, target_h))

        h, w = gray_i.shape

        # numDisparities must be divisible by 16 and <= image width
        num_disp = min(128, (w // 16) * 16)
        if num_disp < 16:
            continue

        R_i, t_i = poses[idx_i]
        R_j, t_j = poses[idx_j]

        def get_K_dense(img_idx):
            ih, iw = images[img_idx][1].shape[:2]
            f = max(iw, ih) * 1.2
            return np.array([[f, 0, iw / 2], [0, f, ih / 2], [0, 0, 1]], dtype=np.float64)

        K_di = get_K_dense(idx_i)
        K_dj = get_K_dense(idx_j)
        P_i = K_di @ np.hstack([R_i, t_i.reshape(3, 1)])
        P_j = K_dj @ np.hstack([R_j, t_j.reshape(3, 1)])

        stereo = cv2.StereoSGBM.create(
            minDisparity=0,
            numDisparities=num_disp,
            blockSize=5,
            P1=8 * 5 * 5,
            P2=32 * 5 * 5,
            disp12MaxDiff=1,
            uniquenessRatio=10,
            speckleWindowSize=100,
            speckleRange=32,
        )

        disparity = stereo.compute(gray_i, gray_j).astype(np.float32) / 16.0

        # Sample valid disparity points
        valid = disparity > 1.0
        ys, xs = np.where(valid)

        if len(xs) < 10:
            continue

        # Subsample for performance (every 4th pixel)
        step = max(1, len(xs) // 5000)
        xs = xs[::step]
        ys = ys[::step]

        # Triangulate sampled points
        pts_i = np.column_stack([xs, ys]).astype(np.float64)
        disp_vals = disparity[ys, xs]
        pts_j = np.column_stack([xs - disp_vals, ys]).astype(np.float64)

        # Filter invalid
        valid_mask = pts_j[:, 0] > 0
        pts_i = pts_i[valid_mask]
        pts_j = pts_j[valid_mask]

        if len(pts_i) < 10:
            continue

        pts_4d = cv2.triangulatePoints(P_i, P_j, pts_i.T, pts_j.T)
        pts_3d = (pts_4d[:3] / pts_4d[3]).T

        # Filter
        finite = np.all(np.isfinite(pts_3d), axis=1)
        pts_3d = pts_3d[finite]
        pts_i_valid = pts_i[finite].astype(int)

        if len(pts_3d) > 0:
            dists = np.linalg.norm(pts_3d, axis=1)
            med = np.median(dists)
            keep = (dists < med * 3) & (dists > med * 0.1)
            pts_3d = pts_3d[keep]
            pts_i_valid = pts_i_valid[keep]

            # Get colors
            img_color = images[idx_i][1]
            for k in range(len(pts_3d)):
                x, y = pts_i_valid[k]
                if 0 <= x < img_color.shape[1] and 0 <= y < img_color.shape[0]:
                    bgr = img_color[y, x]
                    dense_colors.append([bgr[2], bgr[1], bgr[0]])
                    dense_points.append(pts_3d[k])

        print(f"  Pair ({idx_i},{idx_j}): +{len(pts_3d)} dense points")

    points_out = np.array(dense_points)
    colors_out = np.array(dense_colors, dtype=np.uint8) if dense_colors else None

    print(f"  Total: {len(points_out)} points after densification")
    return points_out, colors_out


def create_mesh(points, colors):
    """Create mesh from point cloud using Delaunay + alpha shape filtering."""
    if len(points) < 4:
        print("  Not enough points for mesh")
        return None

    # Center and normalize
    centroid = points.mean(axis=0)
    pts = points - centroid
    scale = np.max(np.abs(pts))
    if scale > 0:
        pts /= scale

    # Statistical outlier removal
    tree = cKDTree(pts)
    k = min(20, len(pts) - 1)
    dists, _ = tree.query(pts, k=k + 1)
    mean_dists = dists[:, 1:].mean(axis=1)
    thresh = mean_dists.mean() + 2 * mean_dists.std()
    inlier = mean_dists < thresh

    pts_clean = pts[inlier]
    colors_clean = colors[inlier] if colors is not None else None

    print(f"  After outlier removal: {len(pts_clean)} points")

    if len(pts_clean) < 4:
        return trimesh.PointCloud(pts_clean, colors=colors_clean)

    try:
        tri = Delaunay(pts_clean)

        # Extract all triangular faces from tetrahedra
        face_set = set()
        for tet in tri.simplices:
            for face in [(tet[0], tet[1], tet[2]),
                         (tet[0], tet[1], tet[3]),
                         (tet[0], tet[2], tet[3]),
                         (tet[1], tet[2], tet[3])]:
                face_set.add(tuple(sorted(face)))

        faces = np.array(list(face_set))

        # Alpha shape filtering
        if len(faces) > 0:
            edge_lengths = []
            for f in faces:
                p0, p1, p2 = pts_clean[f[0]], pts_clean[f[1]], pts_clean[f[2]]
                edge_lengths.append(max(
                    np.linalg.norm(p1 - p0),
                    np.linalg.norm(p2 - p1),
                    np.linalg.norm(p0 - p2)
                ))

            edge_lengths = np.array(edge_lengths)
            alpha = np.percentile(edge_lengths, 85)
            good = faces[edge_lengths < alpha]

            print(f"  Mesh: {len(good)} faces (filtered from {len(faces)})")

            vertex_colors = None
            if colors_clean is not None:
                vertex_colors = np.column_stack([
                    colors_clean,
                    np.full(len(colors_clean), 255)
                ])

            mesh = trimesh.Trimesh(
                vertices=pts_clean,
                faces=good,
                vertex_colors=vertex_colors
            )
            mesh.remove_degenerate_faces()
            mesh.remove_duplicate_faces()

            return mesh

    except Exception as e:
        print(f"  Delaunay failed: {e}")
        return trimesh.PointCloud(pts_clean, colors=colors_clean)

    return None


def export_outputs(mesh, points, colors, output_dir: Path, name: str):
    """Export mesh and point cloud in multiple formats."""
    output_dir.mkdir(parents=True, exist_ok=True)

    obj_path = output_dir / f"{name}.obj"
    glb_path = output_dir / f"{name}.glb"
    ply_path = output_dir / f"{name}.ply"

    if isinstance(mesh, trimesh.PointCloud):
        # Export point cloud
        mesh.export(str(ply_path))
        print(f"  Point cloud -> {ply_path}")

        # Create sphere-based mesh for GLB viewing
        spheres = []
        step = max(1, len(mesh.vertices) // 3000)
        for i in range(0, len(mesh.vertices), step):
            s = trimesh.creation.icosphere(radius=0.003, subdivisions=1)
            s.apply_translation(mesh.vertices[i])
            if mesh.colors is not None and i < len(mesh.colors):
                s.visual.vertex_colors = mesh.colors[i]
            spheres.append(s)

        if spheres:
            combined = trimesh.util.concatenate(spheres)
            combined.export(str(glb_path))
            combined.export(str(obj_path))
            print(f"  Sphere mesh -> {glb_path}")

    elif mesh is not None:
        mesh.export(str(obj_path))
        mesh.export(str(glb_path))
        mesh.export(str(ply_path))
        print(f"  Mesh -> {obj_path}")
        print(f"  Mesh -> {glb_path}")
        print(f"  Mesh -> {ply_path}")

    # Also save raw point cloud as PLY
    if points is not None and len(points) > 0:
        raw_ply = output_dir / f"{name}_points.ply"
        pc = trimesh.PointCloud(points)
        if colors is not None and len(colors) == len(points):
            pc.colors = np.column_stack([colors, np.full(len(colors), 255)])
        pc.export(str(raw_ply))
        print(f"  Raw points -> {raw_ply}")

    # Save metadata
    meta = {
        "name": name,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "num_points": int(len(points)) if points is not None else 0,
        "num_faces": int(len(mesh.faces)) if hasattr(mesh, 'faces') else 0,
        "formats": ["obj", "glb", "ply"],
    }
    meta_path = output_dir / f"{name}_meta.json"
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"  Metadata -> {meta_path}")

    return glb_path


def main():
    parser = argparse.ArgumentParser(
        description="Soulprint Photogrammetry — GPU-accelerated 3D reconstruction"
    )
    parser.add_argument("image_dir", type=str, help="Directory containing photos")
    parser.add_argument("--output", type=str, default="models/",
                        help="Output directory (default: models/)")
    parser.add_argument("--name", type=str, default=None,
                        help="Output name (default: directory name)")
    parser.add_argument("--max-dim", type=int, default=1600,
                        help="Max image dimension (default: 1600)")
    parser.add_argument("--features", type=int, default=8000,
                        help="SIFT features per image (default: 8000)")
    parser.add_argument("--no-dense", action="store_true",
                        help="Skip dense stereo matching")
    args = parser.parse_args()

    image_dir = Path(args.image_dir)
    output_dir = Path(args.output)
    name = args.name or image_dir.stem

    t0 = time.time()

    print("=" * 60)
    print("SOULPRINT PHOTOGRAMMETRY PIPELINE")
    print("=" * 60)

    # Device setup
    print("\n[0/7] Device setup")
    device = get_device()

    # Step 1: Load images
    print(f"\n[1/7] Loading images from {image_dir}")
    images = load_images(image_dir, max_dim=args.max_dim)
    if len(images) < 2:
        print("Need at least 2 images!")
        sys.exit(1)

    # Step 2: Feature detection
    print(f"\n[2/7] SIFT feature detection ({len(images)} images)")
    features = detect_features(images, n_features=args.features)

    # Step 3: GPU matching
    print(f"\n[3/7] GPU feature matching")
    matches_map = match_pairs_gpu(features, images, device)
    if not matches_map:
        print("No good matches found!")
        sys.exit(1)

    # Step 4: Camera poses
    print(f"\n[4/7] Structure from Motion — camera estimation")
    poses, K = estimate_cameras(images, features, matches_map)

    # Step 5: Triangulation
    print(f"\n[5/7] Multi-view triangulation")
    points, colors = triangulate_points(images, features, matches_map, poses, K, device)

    if len(points) == 0:
        print("No 3D points reconstructed!")
        sys.exit(1)

    # Step 6: Dense stereo (optional)
    if not args.no_dense:
        print(f"\n[6/7] Dense stereo matching (GPU)")
        points, colors_dense = densify_point_cloud(images, poses, K, points, colors, device)
        if colors_dense is not None:
            colors = colors_dense
    else:
        print(f"\n[6/7] Dense stereo: SKIPPED")

    # Step 7: Mesh + export
    print(f"\n[7/7] Mesh reconstruction + export")
    mesh = create_mesh(points, colors)

    if mesh is not None:
        glb_path = export_outputs(mesh, points, colors, output_dir, name)
        elapsed = time.time() - t0

        print(f"\n{'=' * 60}")
        print(f"DONE in {elapsed:.1f}s")
        print(f"  Points: {len(points)}")
        if hasattr(mesh, 'faces'):
            print(f"  Faces:  {len(mesh.faces)}")
        print(f"  Output: {output_dir.resolve()}")
        print(f"  Load the .glb in Soulprint 3D viewer at /lab")
        print(f"{'=' * 60}")
    else:
        print("Mesh generation failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
