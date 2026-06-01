import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';

// Cloudinary config — fill in after signing up at cloudinary.com
// Settings → Upload → Upload presets → create an Unsigned preset
const CLOUD_NAME = 'dm0ykr7li';
const UPLOAD_PRESET = 'move_me_uploads';

const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export const uploadPhoto = async (
  localUri: string,
  folder: string      // e.g. 'drivers/uid'
): Promise<string> => {
  const base64 = await readAsStringAsync(localUri, {
    encoding: EncodingType.Base64,
  });

  const body = new FormData();
  body.append('file', `data:image/jpeg;base64,${base64}`);
  body.append('upload_preset', UPLOAD_PRESET);
  body.append('folder', `move-me/${folder}`);

  const response = await fetch(UPLOAD_URL, { method: 'POST', body });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Cloudinary upload failed: ${err}`);
  }

  const data = await response.json();
  return data.secure_url as string;
};
