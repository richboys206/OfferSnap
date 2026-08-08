"use client";

import { useEffect, useRef, useState } from "react";

interface StateOption {
  sigla: string;
  nome: string;
}

interface CitySelectProps {
  value: string; // "Porto Alegre / RS"
  onChange: (value: string) => void;
  disabled?: boolean;
}

const IBGE_STATES =
  "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome";
const IBGE_CITIES = (uf: string) =>
  `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`;

function parseValue(value: string): { uf: string; city: string } {
  const parts = (value || "").split(" / ");
  if (parts.length === 2) {
    return { uf: parts[1].trim(), city: parts[0].trim() };
  }
  return { uf: "", city: "" };
}

/**
 * Seletor de cidade em cascata (Estado → Cidade) usando a API oficial do
 * IBGE (lista mais recente disponível). Emite "Cidade / UF" ao escolher.
 */
export default function CitySelect({ value, onChange, disabled }: CitySelectProps) {
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [uf, setUf] = useState("");
  const [city, setCity] = useState("");
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [error, setError] = useState("");
  const lastEmitted = useRef(value || "");

  // Sincroniza com o valor externo (ex.: ao abrir a página).
  useEffect(() => {
    const parsed = parseValue(value);
    setUf(parsed.uf);
    setCity(parsed.city);
    lastEmitted.current = value || "";
  }, [value]);

  // Carrega os estados uma única vez.
  useEffect(() => {
    let active = true;
    fetch(IBGE_STATES)
      .then((r) => {
        if (!r.ok) throw new Error("estados");
        return r.json();
      })
      .then((data: { sigla: string; nome: string }[]) => {
        if (active) setStates(data);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar os estados.");
      })
      .finally(() => {
        if (active) setLoadingStates(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Carrega cidades quando o estado muda.
  useEffect(() => {
    if (!uf) {
      setCities([]);
      return;
    }
    let active = true;
    setLoadingCities(true);
    setError("");
    fetch(IBGE_CITIES(uf))
      .then((r) => {
        if (!r.ok) throw new Error("cidades");
        return r.json();
      })
      .then((data: { nome: string }[]) => {
        if (active) setCities(data.map((m) => m.nome));
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar as cidades.");
      })
      .finally(() => {
        if (active) setLoadingCities(false);
      });
    return () => {
      active = false;
    };
  }, [uf]);

  // Emite o valor quando estado e cidade estão definidos (evita loop).
  useEffect(() => {
    if (uf && city) {
      const formatted = `${city} / ${uf}`;
      if (formatted !== lastEmitted.current) {
        lastEmitted.current = formatted;
        onChange(formatted);
      }
    }
  }, [uf, city, onChange]);

  return (
    <div className="field">
      <label htmlFor="city-uf">Cidade</label>
      <select
        id="city-uf"
        value={uf}
        disabled={disabled || loadingStates}
        onChange={(e) => {
          setUf(e.target.value);
          setCity("");
        }}
      >
        <option value="">
          {loadingStates ? "Carregando estados..." : "Selecione o estado"}
        </option>
        {states.map((s) => (
          <option key={s.sigla} value={s.sigla}>
            {s.nome} ({s.sigla})
          </option>
        ))}
      </select>
      <select
        value={city}
        disabled={disabled || !uf || loadingCities}
        onChange={(e) => setCity(e.target.value)}
      >
        <option value="">
          {loadingCities ? "Carregando cidades..." : "Selecione a cidade"}
        </option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {error && (
        <small style={{ color: "var(--danger)" }}>{error}</small>
      )}
      {!disabled && (
        <small style={{ color: "var(--muted)" }}>
          Lista de cidades atualizada pela API do IBGE.
        </small>
      )}
    </div>
  );
}