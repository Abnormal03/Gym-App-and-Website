import { useState } from "react"
import { trainerServices } from "../services/trainer.service"
import { Trainer } from "../types/trainer.types"
import { useAuthStore } from "../store/auth.store";

export const useProfile = ()=>{
    const [updating, setupdating] = useState(false);
    const [error, setError] = useState<string|null>(null);
    const [success, setSuccess] = useState<string|null>(null);

    const {login, token} = useAuthStore();
    const updateProfile = async(trainer: Trainer)=>{
        setupdating(true);
        setError(null);
        setSuccess(null);
        try {
            const updatedResponse = await trainerServices.updateTrainer(trainer);
            if (updatedResponse.trainer && token) {
                await login(updatedResponse.trainer, token)
            }else{
                return false
            }
            return true;
        } catch (error) {
            setError(typeof error === 'string' ? error : 'Something went wrong')
        }finally{
            setupdating(false);
        }
    }

    return{
        updating,
        error,
        success,
        updateProfile
    }
}