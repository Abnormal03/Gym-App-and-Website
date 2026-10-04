import { useState } from "react"
import { SelectedImage } from "../types/image.types";
import { imageUploadServices } from "../services/ImageUpload.service";
import { useAuthStore } from "../store/auth.store";
import { useProfile } from "./useProfile";

export const useUpload = ()=>{
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState<string|null>(null);
    const [error, setError] = useState<string|null>(null);
    const {trainer} = useAuthStore();

    const uploadImage = async (image: SelectedImage): Promise<string| false> => {
        setError(null);
        setSuccess(null);
        setUploading(true);

        try {
            if (!trainer) {
                setError("Unable to get the trainer's profile.");
                return false;
            }
            const uploadedUrl = await imageUploadServices.uploadImage(image);

            if (!uploadedUrl) {
                setError("Failed to upload image.");
                return false;
            }

            setSuccess("Successfully uploaded.");
            return uploadedUrl;
        } catch (error: any) {
            setError(error.message || "Failed to upload image.");
            return false;
        } finally {
            setUploading(false);
        }
    }
    return{
        uploading,
        error,
        success,
        uploadImage
    }
}