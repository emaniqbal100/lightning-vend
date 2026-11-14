import QRCode from 'qrcode';

export async function toLightningQrDataUrl(payreq: string): Promise<string> {
  return QRCode.toDataURL('lightning:' + payreq.toUpperCase(), {
    margin: 1,
    width: 420,
    errorCorrectionLevel: 'M',
  });
}
