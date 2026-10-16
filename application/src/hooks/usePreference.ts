import { useEffect, useState } from "react";
import preferenceService from "../services/preference.service";
import { Preference } from "../types/user.types";
import { useAuthStore } from "../store/auth.store";

export const usePreference = ()=>{
    const [error, setError] = useState<string|null>(null);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState<string|false>(false);
    const {token, updatePref} = useAuthStore();


    useEffect(()=>{
        if (!success && !error) return;

        const cleanTimeout = setTimeout(()=>{
            setError(null);
            setSuccess(false);
        },5000);

        return ()=> clearTimeout(cleanTimeout);
    },[success, error])

    const savePreference = async (data: Preference)=>{
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            const { success: saved, preference: pref } = await preferenceService.updatePreference(data);
            if (!saved || !pref) {
                throw new Error("The server did not confirm the preference update.");
            }
            setSuccess("Updated Successfully");
            const currentUser = useAuthStore.getState().user;
            if (currentUser) {
                await updatePref({ ...currentUser, preference: pref }, token);
            }
        } catch (error: any) {
            console.log("Save Preference Error: ",error?.message);
            setError("Unable To Save Update")
        }finally{
            setSaving(false)
        }
    }

    return{
        error,
        saving,
        success,
        savePreference
    }

}
