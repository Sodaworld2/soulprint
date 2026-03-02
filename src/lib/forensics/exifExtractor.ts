// EXIF/IPTC/XMP Extraction via exifreader
import ExifReader from 'exifreader';
import type { ExifData } from '../../types/forensic';

export async function extractExif(file: File): Promise<ExifData> {
  const buffer = await file.arrayBuffer();
  let tags: Record<string, any> = {};
  try {
    tags = ExifReader.load(buffer, { expanded: true });
  } catch {
    // Not all images have EXIF
  }

  const exif = tags.exif || {};
  const gpsData = tags.gps || {};

  const result: ExifData = {
    make: exif.Make?.description,
    model: exif.Model?.description,
    dateTime: exif.DateTime?.description || exif.DateTimeOriginal?.description,
    focalLength: exif.FocalLength?.value ? Number(exif.FocalLength.value) : undefined,
    aperture: exif.FNumber?.value ? Number(exif.FNumber.value) : undefined,
    iso: exif.ISOSpeedRatings?.value ? Number(exif.ISOSpeedRatings.value) : undefined,
    exposureTime: exif.ExposureTime?.description,
    software: exif.Software?.description,
    imageWidth: exif.ImageWidth?.value ? Number(exif.ImageWidth.value) : undefined,
    imageHeight: exif.ImageLength?.value ? Number(exif.ImageLength.value) : undefined,
    orientation: exif.Orientation?.value ? Number(exif.Orientation.value) : undefined,
    raw: { ...exif },
    summary: '',
  };

  if (gpsData.Latitude !== undefined && gpsData.Longitude !== undefined) {
    result.gps = { lat: Number(gpsData.Latitude), lon: Number(gpsData.Longitude) };
  }

  // Build summary
  const parts: string[] = [];
  if (result.make && result.model) parts.push(`Shot with ${result.make} ${result.model}`);
  if (result.dateTime) parts.push(`on ${result.dateTime}`);
  if (result.focalLength) parts.push(`at ${result.focalLength}mm`);
  if (result.aperture) parts.push(`f/${result.aperture}`);
  if (result.iso) parts.push(`ISO ${result.iso}`);
  if (result.gps) parts.push(`GPS: ${result.gps.lat.toFixed(4)}, ${result.gps.lon.toFixed(4)}`);
  if (parts.length === 0) parts.push('No EXIF metadata found in this image');
  result.summary = parts.join('. ') + '.';

  return result;
}
