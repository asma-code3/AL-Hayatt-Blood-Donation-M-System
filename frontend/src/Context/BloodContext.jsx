import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './auth-context';
import { BloodContext } from './blood-context';
import { apiRequest } from '../utils/api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const BLOOD_EXPIRY_DAYS = 42;

const createInventorySummary = (inventory) =>
  BLOOD_GROUPS.map((bloodType) => ({
    bloodType,
    quantity: inventory.filter((item) => item.bloodType === bloodType && item.status === 'Available').length,
  }));

export const BloodProvider = ({ children }) => {
  const { user, isAuthReady, logout } = useAuth();
  const [donors, setDonors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [isDataReady, setIsDataReady] = useState(false);

  const inventorySummary = useMemo(() => createInventorySummary(inventory), [inventory]);

  const resetState = useCallback(() => {
    setDonors([]);
    setPatients([]);
    setInventory([]);
    setRequests([]);
    setHistory([]);
  }, []);

  const fetchDonors = useCallback(async () => {
    const response = await apiRequest('/donors');
    return response.data || [];
  }, []);

  const fetchPatients = useCallback(async () => {
    const response = await apiRequest('/patients');
    return response.data || [];
  }, []);

  const fetchInventory = useCallback(async () => {
    const response = await apiRequest('/inventory');
    return response.data || [];
  }, []);

  const fetchRequests = useCallback(async () => {
    const response = await apiRequest('/requests');
    return response.data || [];
  }, []);

  const fetchHistory = useCallback(async () => {
    const response = await apiRequest('/history');
    return response.data || [];
  }, []);

  const refreshDonors = async () => {
    setDonors(await fetchDonors());
  };

  const refreshInventory = async () => {
    setInventory(await fetchInventory());
  };

  const refreshRequests = async () => {
    setRequests(await fetchRequests());
  };

  const refreshHistory = async () => {
    setHistory(await fetchHistory());
  };

  const loadBloodData = useCallback(async () => {
    const [nextDonors, nextPatients, nextInventory, nextRequests, nextHistory] = await Promise.all([
      fetchDonors(),
      fetchPatients(),
      fetchInventory(),
      fetchRequests(),
      fetchHistory(),
    ]);

    setDonors(nextDonors);
    setPatients(nextPatients);
    setInventory(nextInventory);
    setRequests(nextRequests);
    setHistory(nextHistory);
  }, [fetchDonors, fetchPatients, fetchHistory, fetchInventory, fetchRequests]);

  useEffect(() => {
    const initializeData = async () => {
      if (!isAuthReady) return;

      if (!user) {
        resetState();
        setIsDataReady(true);
        return;
      }

      try {
        await loadBloodData();
      } catch (error) {
        if (error.status === 401) {
          logout();
        }
      } finally {
        setIsDataReady(true);
      }
    };

    setIsDataReady(false);
    initializeData();
  }, [user, isAuthReady, loadBloodData, logout, resetState]);

  const addDonor = async (donor) => {
    try {
      const response = await apiRequest('/donors', {
        method: 'POST',
        body: JSON.stringify(donor),
      });
      const newDonor = response.data;
      setDonors((prev) => [...prev, newDonor]);
      await refreshInventory();
      return { success: true, donor: newDonor };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to save donor.' };
    }
  };

  const updateDonor = async (donorId, donor) => {
    try {
      const response = await apiRequest(`/donors/${donorId}`, {
        method: 'PUT',
        body: JSON.stringify(donor),
      });
      const updatedDonor = response.data;
      setDonors((prev) => prev.map((item) => (item.id === donorId ? updatedDonor : item)));
      await Promise.all([refreshInventory(), refreshHistory()]);
      return { success: true, donor: updatedDonor };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to update donor.' };
    }
  };

  const deleteDonor = async (donorId) => {
    try {
      await apiRequest(`/donors/${donorId}`, {
        method: 'DELETE',
      });
      await Promise.all([refreshDonors(), refreshInventory(), refreshRequests(), refreshHistory()]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to delete donor.' };
    }
  };

  const addPatient = async (patient) => {
    try {
      const response = await apiRequest('/patients', {
        method: 'POST',
        body: JSON.stringify(patient),
      });
      setPatients((prev) => [...prev, response.data]);
      return { success: true, patient: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to save patient.' };
    }
  };

  const updatePatient = async (patientId, patient) => {
    try {
      const response = await apiRequest(`/patients/${patientId}`, {
        method: 'PUT',
        body: JSON.stringify(patient),
      });
      const updatedPatient = response.data;
      setPatients((prev) => prev.map((item) => (item.id === patientId ? updatedPatient : item)));
      await refreshRequests();
      return { success: true, patient: updatedPatient };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to update patient.' };
    }
  };

  const deletePatient = async (patientId) => {
    try {
      await apiRequest(`/patients/${patientId}`, {
        method: 'DELETE',
      });
      setPatients((prev) => prev.filter((item) => item.id !== patientId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to delete patient.' };
    }
  };

  const recordDonation = async (donorId) => {
    try {
      const response = await apiRequest(`/donors/${donorId}/donations`, {
        method: 'PATCH',
      });
      setDonors((prev) => prev.map((donor) => (donor.id === donorId ? response.data : donor)));
      await refreshHistory();
      return { success: true, donor: response.data };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to record donation.' };
    }
  };

  const addHistoryEntry = async (entry) => {
    try {
      const response = await apiRequest('/history', {
        method: 'POST',
        body: JSON.stringify(entry),
      });
      const newEntry = response.data;
      setHistory((prev) => [newEntry, ...prev]);
      await refreshDonors();
      return { success: true, entry: newEntry };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to save history entry.' };
    }
  };

  const updateHistoryEntry = async (entryId, entry) => {
    try {
      const response = await apiRequest(`/history/${entryId}`, {
        method: 'PUT',
        body: JSON.stringify(entry),
      });
      const updatedEntry = response.data;
      setHistory((prev) => prev.map((item) => (item.id === entryId ? updatedEntry : item)));
      await refreshDonors();
      return { success: true, entry: updatedEntry };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to update history entry.' };
    }
  };

  const deleteHistoryEntry = async (entryId) => {
    try {
      await apiRequest(`/history/${entryId}`, {
        method: 'DELETE',
      });
      setHistory((prev) => prev.filter((item) => item.id !== entryId));
      await refreshDonors();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to delete history entry.' };
    }
  };

  const addInventoryUnit = async (unit) => {
    try {
      const response = await apiRequest('/inventory', {
        method: 'POST',
        body: JSON.stringify(unit),
      });
      const newUnit = response.data;
      setInventory((prev) => [...prev, newUnit]);
      await refreshDonors();
      return { success: true, unit: newUnit };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to save inventory unit.' };
    }
  };

  const updateInventoryUnit = async (unitId, unit) => {
    try {
      const response = await apiRequest(`/inventory/${unitId}`, {
        method: 'PUT',
        body: JSON.stringify(unit),
      });
      const updatedUnit = response.data;
      setInventory((prev) => prev.map((item) => (item.id === unitId ? updatedUnit : item)));
      await refreshDonors();
      return { success: true, unit: updatedUnit };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to update inventory unit.' };
    }
  };

  const deleteInventoryUnit = async (unitId) => {
    try {
      await apiRequest(`/inventory/${unitId}`, {
        method: 'DELETE',
      });
      setInventory((prev) => prev.filter((item) => item.id !== unitId));
      await refreshDonors();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to delete inventory unit.' };
    }
  };

  const addTransfusionRequest = async (request) => {
    try {
      const response = await apiRequest('/requests', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      const newRequest = response.data;
      setRequests((prev) => [newRequest, ...prev]);
      await refreshInventory();
      return { success: true, request: newRequest };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to issue blood request.' };
    }
  };

  const updateTransfusionRequest = async (requestId, request) => {
    try {
      const response = await apiRequest(`/requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify(request),
      });
      const updatedRequest = response.data;
      setRequests((prev) => prev.map((item) => (item.id === requestId ? updatedRequest : item)));
      await refreshInventory();
      return { success: true, request: updatedRequest };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to update blood request.' };
    }
  };

  const deleteTransfusionRequest = async (requestId) => {
    try {
      await apiRequest(`/requests/${requestId}`, {
        method: 'DELETE',
      });
      setRequests((prev) => prev.filter((item) => item.id !== requestId));
      await refreshInventory();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Unable to delete blood request.' };
    }
  };

  const getAvailableUnitsCount = (bloodType) =>
    inventory.filter((item) => item.bloodType === bloodType && item.status === 'Available').length;

  return (
    <BloodContext.Provider
      value={{
        bloodGroups: BLOOD_GROUPS,
        bloodExpiryDays: BLOOD_EXPIRY_DAYS,
        donors,
        patients,
        inventory,
        inventorySummary,
        requests,
        history,
        isDataReady,
        addDonor,
        updateDonor,
        deleteDonor,
        addPatient,
        updatePatient,
        deletePatient,
        recordDonation,
        addHistoryEntry,
        updateHistoryEntry,
        deleteHistoryEntry,
        addInventoryUnit,
        updateInventoryUnit,
        deleteInventoryUnit,
        addTransfusionRequest,
        updateTransfusionRequest,
        deleteTransfusionRequest,
        getAvailableUnitsCount,
      }}
    >
      {children}
    </BloodContext.Provider>
  );
};
