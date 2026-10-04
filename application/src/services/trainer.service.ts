import { ProfileResponse, Trainer } from "../types/trainer.types";
import api from "./api";

export const trainerServices = {
    updateTrainer:async(data: Trainer):Promise<ProfileResponse>=>
        api.put('/trainers/profile',data),
    getTrainer: async ():Promise<ProfileResponse>=>
        api.get('trainers/profile')
}