import { AuthResponse, loginDTO, registerDTO } from "../types/trainer.types";
import api from "./api";

export const authService = {
    register: (data: registerDTO): Promise<AuthResponse>=>{
        return api.post('/trainers/register', data)
    },
    login: (data:loginDTO): Promise<AuthResponse>=>
        api.post('/trainers/login', data)
}