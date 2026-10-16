import { SelectedImage } from "../types/image.types";

const CLOUDINARY_CLOUD_NAME = "dcanz9on6";
const CLOUDINARY_UPLOAD_PRESET = "gym_app_preset";

type CloudinaryUploadResponse = {
  secure_url?: string;
  error?: { message?: string };
};

export const imageUploadServices = {
  uploadImage: async (image: SelectedImage): Promise<string> => {
    const formData = new FormData();
    formData.append(
      "file",
      {
        uri: image.uri,
        name: image.name,
        type: image.type,
      } as any,
    );
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData },
    );
    const result = (await response.json()) as CloudinaryUploadResponse;
    if (!response.ok) {
      throw new Error(result.error?.message || "Image upload failed.");
    }
    if (!result.secure_url) {
      throw new Error("The image service did not return an image URL.");
    }
    return result.secure_url;
  },
};
