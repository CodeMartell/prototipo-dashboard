import re
import os
from typing import Any, Dict, List
import pandas as pd
from src.validator import padronizar_periodo


class ExcelParser:
    """
    Parser responsável por inspecionar, mapear e extrair os 3 KPIs logísticos
    (Logistic Cost, Air Freight e Logistics vs Prod) a partir de planilhas Excel.
    """

    def __init__(self, config_kpis: Dict[str, Any]):
        self.config_kpis = config_kpis

    def extrair_todos_kpis(self, caminho_arquivo: str) -> Dict[str, List[Dict[str, Any]]]:
        """Lê o arquivo Excel e extrai as seções correspondentes a cada um dos 3 KPIs."""
        if not os.path.exists(caminho_arquivo):
            raise FileNotFoundError(f"Arquivo Excel não encontrado: {caminho_arquivo}")

        excel_file = pd.ExcelFile(caminho_arquivo)
        nomes_abas = excel_file.sheet_names

        dados_consolidados = {
            "logisticCost": [],
            "airFreight": [],
            "logisticsVsProd": []
        }

        # Extrai cada KPI baseado na configuração de abas compatíveis
        dados_consolidados["logisticCost"] = self._extrair_logistic_cost(excel_file, nomes_abas)
        dados_consolidados["airFreight"] = self._extrair_air_freight(excel_file, nomes_abas)
        dados_consolidados["logisticsVsProd"] = self._extrair_logistics_vs_prod(excel_file, nomes_abas)

        return dados_consolidados

    def _encontrar_aba(self, nomes_abas: List[str], abas_compativeis: List[str]) -> str:
        """Encontra o nome real da aba no arquivo de forma case-insensitive."""
        for compat in abas_compativeis:
            for real in nomes_abas:
                if compat.lower().replace(" ", "") in real.lower().replace(" ", ""):
                    return real
        return ""

    def _limpar_cabecalhos(self, df: pd.DataFrame) -> pd.DataFrame:
        """Encontra a linha correta de cabeçalho e normaliza os nomes das colunas."""
        df = df.dropna(how="all").reset_index(drop=True)
        if df.empty:
            return df

        # Se as colunas atuais são genéricas (0, 1, 2...), tenta encontrar a primeira linha com texto
        if all(isinstance(col, int) for col in df.columns):
            for i, row in df.iterrows():
                if row.count() >= 2 and any(isinstance(v, str) for v in row.values):
                    df.columns = [str(c).strip() for c in row.values]
                    df = df.iloc[i + 1:].reset_index(drop=True)
                    break

        novas_colunas = []
        for col in df.columns:
            limpo = str(col).strip().lower()
            limpo = re.sub(r"[\(\)\[\]\{\}]", "", limpo)
            limpo = limpo.replace("%", "pct").replace("/", "_").replace("-", "_").replace(" ", "_")
            limpo = re.sub(r"_+", "_", limpo).strip("_")
            novas_colunas.append(limpo)

        df.columns = novas_colunas
        return df

    def _obter_campo(self, row: pd.Series, *chaves_possiveis: str) -> Any:
        """Busca flexível pelo valor correspondente dentre múltiplos nomes possíveis de coluna."""
        for chave in chaves_possiveis:
            if chave in row.index:
                val = row[chave]
                if not pd.isna(val):
                    return val
            # Busca por substring caso haja prefixos/sufixos
            for col in row.index:
                if chave in col:
                    val = row[col]
                    if not pd.isna(val):
                        return val
        return None

    def _extrair_logistic_cost(self, excel_file: pd.ExcelFile, nomes_abas: List[str]) -> List[Dict[str, Any]]:
        """Extrai dados do KPI 1: Logistic Cost KPI TV (War Room Report)."""
        regras = self.config_kpis.get("logisticCost", {})
        aba = self._encontrar_aba(nomes_abas, regras.get("abas_compativeis", []))
        if not aba:
            return []

        df = excel_file.parse(aba)
        df = self._limpar_cabecalhos(df)
        registros = []

        for _, row in df.iterrows():
            if row.isna().all():
                continue
            periodo_raw = self._obter_campo(row, "periodo", "mes", "mês") or row.iloc[0]
            periodo_info = padronizar_periodo(periodo_raw)

            registros.append({
                "periodo": periodo_info["periodo"],
                "mes": periodo_info["mes"],
                "ano": periodo_info["ano"],
                "faturamento_musd": self._obter_campo(row, "faturamento_musd", "faturamento", "revenue"),
                "custo_logistico_musd": self._obter_campo(row, "custo_logistico_musd", "custo_logistico", "custo_total", "logistic_cost"),
                "realizado_pct": self._obter_campo(row, "realizado_pct", "realizado", "actual_pct", "actual"),
                "target_pct": self._obter_campo(row, "target_pct", "target", "meta_pct", "meta"),
                "variacao_pct": self._obter_campo(row, "variacao_pct", "variacao", "variance_pct", "variance")
            })

        return registros

    def _extrair_air_freight(self, excel_file: pd.ExcelFile, nomes_abas: List[str]) -> List[Dict[str, Any]]:
        """Extrai dados do KPI 2: Air Freight KPI TV (Frete Aéreo sobre Faturamento %)."""
        regras = self.config_kpis.get("airFreight", {})
        aba = self._encontrar_aba(nomes_abas, regras.get("abas_compativeis", []))
        if not aba:
            return []

        df = excel_file.parse(aba)
        df = self._limpar_cabecalhos(df)
        registros = []

        for _, row in df.iterrows():
            if row.isna().all():
                continue
            periodo_raw = self._obter_campo(row, "periodo", "mes", "mês") or row.iloc[0]
            periodo_info = padronizar_periodo(periodo_raw)

            registros.append({
                "periodo": periodo_info["periodo"],
                "mes": periodo_info["mes"],
                "ano": periodo_info["ano"],
                "custo_frete_aereo_musd": self._obter_campo(row, "custo_frete_aereo_musd", "custo_frete_aereo", "air_freight_musd", "frete_aereo"),
                "faturamento_musd": self._obter_campo(row, "faturamento_musd", "faturamento", "revenue"),
                "frete_aereo_pct": self._obter_campo(row, "frete_aereo_pct", "frete_aereo", "realizado_pct", "actual_pct"),
                "target_pct": self._obter_campo(row, "target_pct", "target", "meta_pct", "meta")
            })

        return registros

    def _extrair_logistics_vs_prod(self, excel_file: pd.ExcelFile, nomes_abas: List[str]) -> List[Dict[str, Any]]:
        """Extrai dados do KPI 3: Logistics Cost x Product Amount."""
        regras = self.config_kpis.get("logisticsVsProd", {})
        aba = self._encontrar_aba(nomes_abas, regras.get("abas_compativeis", []))
        if not aba:
            return []

        df = excel_file.parse(aba)
        df = self._limpar_cabecalhos(df)
        registros = []

        for _, row in df.iterrows():
            if row.isna().all():
                continue
            periodo_raw = self._obter_campo(row, "periodo", "mes", "mês") or row.iloc[0]
            periodo_info = padronizar_periodo(periodo_raw)

            registros.append({
                "periodo": periodo_info["periodo"],
                "mes": periodo_info["mes"],
                "ano": periodo_info["ano"],
                "volume_producao_unidades": self._obter_campo(row, "volume_producao_unidades", "volume_producao", "production_units"),
                "valor_producao_musd": self._obter_campo(row, "valor_producao_musd", "valor_producao", "prod_amount_musd"),
                "custo_logistico_musd": self._obter_campo(row, "custo_logistico_musd", "custo_logistico", "logistic_cost"),
                "razao_custo_prod": self._obter_campo(row, "razao_custo_prod", "razao_custo", "cost_ratio", "razao")
            })

        return registros

