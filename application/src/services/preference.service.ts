import { Preference } from '../types/user.types'
import api from './api'

const preferenceService = {
    updatePreference: (data: Preference):Promise<{success: boolean, preference: Preference }>=>
        api.put('/users/preference', data)
    
}

export default preferenceService