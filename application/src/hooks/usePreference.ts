import { useEffect, useState } from "react"
import preferenceService from "../services/preference.service";
import { Preference } from "../types/user.types";
import { useAuthStore } from "../store/auth.store";

export const usePreference = ()=>{
    const [error, setError] = useState<string|null>(null);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState<string|false>(false);
    const {user, token, updatePref} = useAuthStore();


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
            const {success:saved, preference: pref} = await preferenceService.updatePreference(data);
            if (saved) {
                setSuccess("Updated Successfully");
                //save locally too...
                if (user?.preference) {
                    const {preference, ...restOfUser} = user;
                    console.log(pref);
                    await updatePref({preference:pref, ...restOfUser},token)
                }
            }
        } catch (error: any) {
            console.log(error?.message);
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