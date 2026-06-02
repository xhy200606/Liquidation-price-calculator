import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowDownLeft, ArrowUpRight, Calculator, CircleHelp, Gauge, Percent, Wallet } from "lucide-react";
import "./styles.css";

type Mode = "leverage" | "margin";
type PositionUnit = "contracts" | "usdt";

type CalculationResult = {
  long: number | null;
  short: number | null;
  bufferLong: number | null;
  bufferShort: number | null;
};

const numberFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 8
});

const percentFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 3
});

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function calculateByLeverage(price: number, leverage: number, maintenanceRate: number): CalculationResult {
  if (price <= 0 || leverage <= 0 || maintenanceRate < 0) {
    return emptyResult();
  }

  const initialMarginRate = 1 / leverage;
  const long = price * (1 - initialMarginRate + maintenanceRate);
  const short = price * (1 + initialMarginRate - maintenanceRate);

  return normalizeResult(price, long, short);
}

function calculateByMargin(
  price: number,
  margin: number,
  positionSize: number,
  positionUnit: PositionUnit,
  maintenanceRate: number
): CalculationResult {
  if (price <= 0 || margin <= 0 || positionSize <= 0 || maintenanceRate < 0 || maintenanceRate >= 1) {
    return emptyResult();
  }

  const quantity = positionUnit === "usdt" ? positionSize / price : positionSize;
  if (quantity <= 0) {
    return emptyResult();
  }

  const marginPerUnit = margin / quantity;
  const long = (price - marginPerUnit) / (1 - maintenanceRate);
  const short = (price + marginPerUnit) / (1 + maintenanceRate);

  return normalizeResult(price, long, short);
}

function normalizeResult(price: number, long: number, short: number): CalculationResult {
  const longPrice = long > 0 ? long : null;
  const shortPrice = short > 0 ? short : null;

  return {
    long: longPrice,
    short: shortPrice,
    bufferLong: longPrice ? ((price - longPrice) / price) * 100 : null,
    bufferShort: shortPrice ? ((shortPrice - price) / price) * 100 : null
  };
}

function emptyResult(): CalculationResult {
  return {
    long: null,
    short: null,
    bufferLong: null,
    bufferShort: null
  };
}

function formatPrice(value: number | null) {
  return value === null ? "--" : numberFormatter.format(value);
}

function formatPercent(value: number | null) {
  return value === null ? "--" : `${percentFormatter.format(value)}%`;
}

function App() {
  const [mode, setMode] = useState<Mode>("leverage");
  const [price, setPrice] = useState("100");
  const [leverage, setLeverage] = useState("10");
  const [margin, setMargin] = useState("10");
  const [positionSize, setPositionSize] = useState("1");
  const [positionUnit, setPositionUnit] = useState<PositionUnit>("contracts");
  const [maintenanceRate, setMaintenanceRate] = useState("0.5");

  const result = useMemo(() => {
    const currentPrice = toNumber(price);
    const mmr = toNumber(maintenanceRate) / 100;

    if (mode === "leverage") {
      return calculateByLeverage(currentPrice, toNumber(leverage), mmr);
    }

    return calculateByMargin(currentPrice, toNumber(margin), toNumber(positionSize), positionUnit, mmr);
  }, [leverage, maintenanceRate, margin, mode, positionSize, positionUnit, price]);

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="title-block">
          <div className="app-mark">
            <Calculator size={22} />
          </div>
          <div>
            <h1>强平价格计算器</h1>
            <p>本地 Mac 桌面版 · 同时计算做多与做空强平价</p>
          </div>
        </div>

        <div className="mode-switch" role="tablist" aria-label="计算模式">
          <button className={mode === "leverage" ? "active" : ""} onClick={() => setMode("leverage")} type="button">
            <Gauge size={18} />
            杠杆倍数
          </button>
          <button className={mode === "margin" ? "active" : ""} onClick={() => setMode("margin")} type="button">
            <Wallet size={18} />
            保证金数
          </button>
        </div>

        <div className="content-grid">
          <form className="glass-panel input-panel">
            <Field
              label="现价"
              value={price}
              onChange={setPrice}
              inputMode="decimal"
              suffix="USDT"
              helper="以开仓价/当前标记价口径输入。"
            />

            {mode === "leverage" ? (
              <Field
                label="杠杆倍数"
                value={leverage}
                onChange={setLeverage}
                inputMode="decimal"
                suffix="x"
                helper="用于估算逐仓场景下的初始保证金率。"
              />
            ) : (
              <>
                <Field
                  label="保证金数"
                  value={margin}
                  onChange={setMargin}
                  inputMode="decimal"
                  suffix="USDT"
                  helper="逐仓保证金总额。"
                />
                <Field
                  label="仓位"
                  value={positionSize}
                  onChange={setPositionSize}
                  inputMode="decimal"
                  suffix={positionUnit === "contracts" ? "手" : "USDT"}
                  helper={positionUnit === "contracts" ? "按标的数量计算，1 手按 1 单位标的处理。" : "按仓位名义价值计算，会用现价换算为标的数量。"}
                >
                  <SegmentedControl
                    value={positionUnit}
                    options={[
                      { label: "手", value: "contracts" },
                      { label: "USDT", value: "usdt" }
                    ]}
                    onChange={setPositionUnit}
                  />
                </Field>
              </>
            )}

            <Field
              label="维持保证金率"
              value={maintenanceRate}
              onChange={setMaintenanceRate}
              inputMode="decimal"
              suffix="%"
              helper="不同交易所和仓位档位不同，可按实际规则调整。"
            />
          </form>

          <section className="result-stack" aria-label="计算结果">
            <ResultCard
              accent="green"
              icon={<ArrowDownLeft size={20} />}
              label="做多强平价"
              price={formatPrice(result.long)}
              buffer={formatPercent(result.bufferLong)}
              caption="价格下跌触发"
            />
            <ResultCard
              accent="pink"
              icon={<ArrowUpRight size={20} />}
              label="做空强平价"
              price={formatPrice(result.short)}
              buffer={formatPercent(result.bufferShort)}
              caption="价格上涨触发"
            />
          </section>
        </div>

        <section className="glass-panel note-panel">
          <CircleHelp size={18} />
          <p>
            公式采用简化逐仓模型。保证金模式会先用仓位计算每单位保证金；仓位选择 USDT 时按名义价值 ÷ 现价换算。不含手续费、资金费率、滑点、阶梯维持保证金和交易所自动减仓规则。
          </p>
        </section>
      </section>
    </main>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
  helper: string;
  inputMode: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  children?: React.ReactNode;
};

function Field({ label, value, onChange, suffix, helper, inputMode, children }: FieldProps) {
  return (
    <div className="field">
      <span className="field-top">
        <span className="field-label">{label}</span>
        {children}
      </span>
      <span className="input-wrap">
        <input value={value} onChange={(event) => onChange(event.target.value)} inputMode={inputMode} />
        <span>{suffix}</span>
      </span>
      <small>{helper}</small>
    </div>
  );
}

type SegmentedControlProps<T extends string> = {
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
};

function SegmentedControl<T extends string>({ value, options, onChange }: SegmentedControlProps<T>) {
  return (
    <span className="mini-switch" role="tablist" aria-label="仓位单位">
      {options.map((option) => (
        <button
          className={value === option.value ? "active" : ""}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </span>
  );
}

type ResultCardProps = {
  accent: "green" | "pink";
  icon: React.ReactNode;
  label: string;
  price: string;
  buffer: string;
  caption: string;
};

function ResultCard({ accent, icon, label, price, buffer, caption }: ResultCardProps) {
  return (
    <article className={`glass-panel result-card ${accent}`}>
      <div className="result-head">
        <span className="result-icon">{icon}</span>
        <span>{label}</span>
      </div>
      <strong>{price}</strong>
      <div className="result-foot">
        <span>{caption}</span>
        <span>
          <Percent size={15} />
          距现价 {buffer}
        </span>
      </div>
    </article>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
