import { useCallback, useState } from "react"
import { loginDTO, PendingTrainer, registerDTO, Trainer } from "../types/trainer.types";
import { authService } from "../services/auth.service";
import { useAuthStore } from "../store/auth.store";
import { useRouter } from "expo-router";
import { deleteItem, readItem, writeItem } from "../services/auth.storage";

export const useAuth = ()=>{
    const [loading, setLoading] = useState(false);
    const [loginError, setLoginError] = useState<string| null>(null);
    const [success, setSuccess] = useState<string|null>(null);
    const {login, logout} = useAuthStore();

    const router = useRouter();

    const getErrorMessage = (err: unknown) =>
    typeof err === 'string' ? err : 'Something went wrong';

    const handleRegister = async (data: registerDTO)=>{
        setLoading(true);
        setLoginError(null);
        setSuccess(null);
        try {
            const response = await authService.register(data);
            await login(response.trainer,response.token);
            setSuccess("successfully registered!");
            router.replace('/(tabs)')
        } catch (error) {
            setLoginError(getErrorMessage(error))
        }finally{
            setLoading(false);
        }
    }

    const handleLogin = async(data: loginDTO)=>{
        setLoading(true);
        setLoginError(null);
        setSuccess(null);
        try {
            const response = await authService.login(data);
            await login(response.trainer, response.token)
            setSuccess("successfully logged In!");
            router.replace('/(tabs)')
        } catch (error) {
            setLoginError(getErrorMessage(error))
        }finally{
            setLoading(false)
        }
    }

    const hanldeLogout = async() => {
        await logout();
        router.replace('/(auth)/login');
    }


    const saveProgres = async (trainer: PendingTrainer)=>{
        await writeItem('trainerProgress', JSON.stringify(trainer));
    }

    const loadProgress = useCallback(async()=>{
        const trainer = await readItem('trainerProgress');
        if (!trainer) {
            return false;
        }
        return trainer;
    }, [])

    const deleteProgress = async()=>{
        await deleteItem('trainerProgress')
    }

    return({
        loading,
        loginError,
        success,
        deleteProgress,
        saveProgres,
        loadProgress,
        handleLogin,
        handleRegister,
        hanldeLogout
    })
}