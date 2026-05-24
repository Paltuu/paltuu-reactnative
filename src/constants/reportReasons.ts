export const REPORT_REASONS = [
    { code: 'SPAM', label: 'Spam' },
    { code: 'HATE_SPEECH', label: 'Hate speech or symbols' },
    { code: 'HARASSMENT', label: 'Bullying or harassment' },
    { code: 'ANIMAL_ABUSE', label: 'Animal abuse' },
    { code: 'MISINFORMATION', label: 'False information' },
    { code: 'INAPPROPRIATE', label: 'Inappropriate content' },
    { code: 'SCAM', label: 'Scam or fraud' },
    { code: 'OTHER', label: 'Other' }
] as const;

export type ReportReasonCode = typeof REPORT_REASONS[number]['code'];
