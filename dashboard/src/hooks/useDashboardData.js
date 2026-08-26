import { useState, useEffect, useCallback } from 'react';
import { dashboardApi } from '../services/api';
import {
  logisticCostData,
  airFreightData,
  logisticsCostVsProdData,
} from '../data/mockData';

export function useDashboardData() {
  const [logisticCost, setLogisticCost] = useState(logisticCostData);
  const [airFreight, setAirFreight] = useState(airFreightData);
  const [logisticsVsProd, setLogisticsVsProd] = useState(logisticsCostVsProdData);
  const [dataSource, setDataSource] = useState('mock'); // 'mock' | 'api'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getDashboardData();
      let hasData = false;

      if (data.logistic_cost && data.logistic_cost.length > 0) {
        setLogisticCost(data.logistic_cost);
        hasData = true;
      }
      if (data.air_freight && data.air_freight.length > 0) {
        setAirFreight(data.air_freight);
        hasData = true;
      }
      if (data.logistics_vs_prod && data.logistics_vs_prod.length > 0) {
        setLogisticsVsProd(data.logistics_vs_prod);
        hasData = true;
      }

      if (hasData) {
        setDataSource('api');
      } else {
        setDataSource('mock');
      }
    } catch (err) {
      console.warn('[DataLens] Backend indisponível, utilizando dados mock locais:', err.message);
      setError(err.message);
      setDataSource('mock');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    logisticCost,
    airFreight,
    logisticsVsProd,
    dataSource,
    isLoading,
    error,
    reloadData: loadData,
  };
}
