import { SelectedImage } from "../types/image.types";

export const imageUploadServices= {
    uploadImage: async (image: SelectedImage)=>{
        try {
            const CLOUDINARY_CLOUD_NAME = "dcanz9on6";
            const CLOUDINARY_PRESET = "gym_app_preset";

            console.log(CLOUDINARY_CLOUD_NAME, CLOUDINARY_PRESET)
            
            const cloudinaryData = new FormData();
            cloudinaryData.append('file',{
                uri: image.uri,
                name: image.name,
                type: image.type
            } as any)

            cloudinaryData.append('upload_preset',CLOUDINARY_PRESET);

            const cloudResponse = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
                {
                    method: 'POST',
                    body: cloudinaryData
                }
            )
            const cloudResult = await cloudResponse.json();
            if (!cloudResponse.ok) {
                throw new Error(cloudResult.error?.message || 'Cloudinary upload failed');
            }

            const imageUrl = cloudResult.secure_url;

            return imageUrl;
        } catch (error:any) {
            console.log(error.message)
            return false;
        }
    }
}