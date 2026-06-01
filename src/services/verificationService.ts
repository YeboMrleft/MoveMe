import { updateUser } from './userService';

// SmileIdentity is STUBBED for manual review MVP.
// When ready to automate, set SMILE_ENABLED = true and fill in credentials.
const SMILE_ENABLED = false;
const SMILE_PARTNER_ID = 'YOUR_SMILE_PARTNER_ID';
const SMILE_API_KEY = 'YOUR_SMILE_API_KEY';
const SMILE_BASE_URL = 'https://testapi.smileidentity.com/v1';

export interface VerificationPayload {
  idNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  selfieBase64: string;
  idDocumentBase64?: string;
}

export interface VerificationResult {
  passed: boolean;
  manual: boolean;         // true = queued for human review
  confidence?: number;
  reason?: string;
}

export const verifyDriverIdentity = async (
  uid: string,
  payload: VerificationPayload
): Promise<VerificationResult> => {
  // Always mark as pending first — admin reviews manually
  await updateUser(uid, { verificationStatus: 'pending' });

  if (!SMILE_ENABLED) {
    // Manual review path — photos already saved by DriverVerifyScreen
    return { passed: false, manual: true, reason: 'Queued for manual review' };
  }

  // Automated path (activate when ready)
  try {
    const body = {
      partner_id: SMILE_PARTNER_ID,
      api_key: SMILE_API_KEY,
      id_info: {
        country: 'ZA',
        id_type: 'NATIONAL_ID',
        id_number: payload.idNumber,
        first_name: payload.firstName,
        last_name: payload.lastName,
        dob: payload.dateOfBirth,
      },
      images: [
        { image_type_id: 0, image: payload.selfieBase64 },
        ...(payload.idDocumentBase64
          ? [{ image_type_id: 1, image: payload.idDocumentBase64 }]
          : []),
      ],
      options: { return_job_status: true, return_history: false, return_images: false },
    };

    const response = await fetch(`${SMILE_BASE_URL}/smile_links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    const passed = data?.job_complete === true && data?.result?.result_code === '0114';
    const confidence = data?.result?.confidence_value
      ? parseFloat(data.result.confidence_value)
      : undefined;

    await updateUser(uid, { verificationStatus: passed ? 'verified' : 'rejected' });
    return { passed, manual: false, confidence, reason: data?.result?.result_text };
  } catch (e: any) {
    await updateUser(uid, { verificationStatus: 'rejected' });
    return { passed: false, manual: false, reason: e.message };
  }
};

export const uriToBase64 = async (uri: string): Promise<string> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
