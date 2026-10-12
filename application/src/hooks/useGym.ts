import { useEffect, useRef, useState } from 'react';
import { gymService } from '../services/gym.service';
import { Gym } from '../types/gym.types';

export const useGyms = () => {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gymDetails, setGymDetails] = useState<Gym | null>(null);

  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string| null>(null)
  const requestOrder = useRef(0);

  const getErrorMessage = (err: unknown): string => {
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    if (err && typeof err === 'object' && 'message' in err) {
      const message = (err as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
    return 'Something went wrong';
  };

  useEffect(()=>{
    if(!searchError || gyms.length===0) return;
    const errorTimeout = setTimeout(()=>{setSearchError(null)},5000);

    return ()=> clearTimeout(errorTimeout)
  },[searchError])

  const getGyms = async () => {
    const requestId = ++requestOrder.current;
    setLoading(true);
    setError(null);
    setSearching(false);
    setSearchError(null);

    try {
      const response = await gymService.getAll();
      if (requestId === requestOrder.current) {
        setGyms(response);
      }
    } catch (err) {
      if (requestId === requestOrder.current) {
        setError(getErrorMessage(err));
      }
    } finally {
      if (requestId === requestOrder.current) {
        setLoading(false);
      }
    }
  };

  const getGymDetails = async (id: number) => {
    setLoading(true);
    setError(null);

    try {
      const details = await gymService.getById(id);
      setGymDetails(details);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const searchGymByNameAndLocation = async (nameloc:string)=>{
    const requestId = ++requestOrder.current;
    setLoading(false);
    setError(null);
    setSearching(true);
    setSearchError(null);
    try {
      const byName = await gymService.searchGyms(nameloc,"");
      if (requestId !== requestOrder.current) return;

      if (byName.success && byName.message) {
        const byLocation = await gymService.searchGyms("", nameloc);
        if (requestId !== requestOrder.current) return;

        if (byLocation.message) {
          setSearchError(byLocation.message);
        }
        if (byLocation.success) {
          setGyms(byLocation.gyms);
        }
      }else if(!byName.success && byName.message){
        setSearchError(byName.message)
      }
      if (byName.success && !byName.message) {
        setGyms(byName.gyms)
      }

    } catch (error) {
      if (requestId === requestOrder.current) {
        setSearchError(getErrorMessage(error));
      }
    }finally{
      if (requestId === requestOrder.current) {
        setSearching(false);
      }
    }
  }

  return {
    getGyms,
    getGymDetails,
    gymDetails,
    gyms,
    loading,
    error,
    searching,
    searchError,
    searchGymByNameAndLocation
  };
};