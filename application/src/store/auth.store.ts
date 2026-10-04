import { create } from "zustand";
import { Trainer } from "../types/trainer.types";
import { deleteItem, readItem, writeItem } from "../services/auth.storage";

interface AuthState{
    trainer: Trainer | null;
    token: string | null;
    isLoading:boolean;
    login: (trainer: Trainer, token: string)=> Promise<void>;
    logout: ()=>Promise<void>;
    hydrate:()=>Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get)=>{
    return({
        trainer:null,
        token: null,
        isLoading: true,
        
        login: async (trainer, token)=>{
            await writeItem('token', token);
            await writeItem('trainer', JSON.stringify(trainer));
            set({trainer, token})
        },
        logout:async ()=>{
            await deleteItem('token')
            await deleteItem('trainer');
            set({trainer: null, token:null})
        },
        hydrate: async()=>{
            try {
                const token = await readItem('token');
                const trainer = await readItem('trainer');
                if (token && trainer) {
                    set({trainer: JSON.parse(trainer), token})
                }
            } catch (error) {
                
            }finally{
                set({isLoading: false})
            }
        }
    })
})