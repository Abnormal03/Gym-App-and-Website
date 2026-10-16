import { useState } from "react"
import { SelectedImage } from "../types/image.types";
import { imageUploadServices } from "../services/imageUpload.service";
import { useProfile } from "./useProfile";
import { useAuthStore } from "../store/auth.store";

export const useUpload = ()=>{
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState<string|null>(null);
    const [error, setError] = useState<string|null>(null);
    const {updateProfile} = useProfile();
    const {user} = useAuthStore()

    const uploadImage = async (image: SelectedImage): Promise<boolean> => {
        setError(null);
        setSuccess(null);
        setUploading(true);

        try {
            if (!user) {
                setError("Unable to get the user's profile.");
                return false;
            }
            const uploadedUrl = await imageUploadServices.uploadImage(image);

            if (!uploadedUrl) {
                setError("Failed to upload image.");
                return false;
            }


            const updated = await updateProfile({
                name: user.name,
                phone: user.phone,
                photoUrl: uploadedUrl,
            });

            if (!updated) {
                setError("Image uploaded, but profile update failed.");
                return false;
            }

            setSuccess("Successfully uploaded.");
            return true;
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "Failed to upload image.");
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
