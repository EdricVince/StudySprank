// ~3.5M chars of base64 ≈ 2.6 MB image — plenty for an ID-card photo.
export const MAX_CARD_LEN = 3_500_000;

export const IMAGE_DATA_URL =
  /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;
