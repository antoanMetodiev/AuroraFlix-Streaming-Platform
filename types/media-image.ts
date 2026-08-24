export type ImageType = "POSTER" | "BACKDROP";

export type MediaImage = {
  id: string;
  imageType: ImageType;
  imageURL: string;
};
