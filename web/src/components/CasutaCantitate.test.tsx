import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CasutaCantitate, numarDinText, textCantitateValid } from "./CasutaCantitate";

// S25, BUG-8: casuta pastreaza focalizarea cat scrii, textul nu e rescris, virgula e acceptata

function Proba({ tip = "zecimal" as const }: { tip?: "zecimal" | "intreg" }) {
  const [v, setV] = useState("");
  return (
    <div>
      <CasutaCantitate value={v} onChange={setV} tip={tip} eticheta="Cantitate" />
      <output data-testid="valoare">{v}</output>
    </div>
  );
}

describe("CasutaCantitate", () => {
  it("„12” și „125” se scriu dintr-o mișcare, fără pierderea focalizării", async () => {
    const u = userEvent.setup();
    render(<Proba />);
    const casuta = screen.getByLabelText("Cantitate");
    await u.click(casuta);
    await u.keyboard("12");
    expect(casuta).toHaveFocus();
    expect(casuta).toHaveValue("12");
    await u.keyboard("5");
    expect(casuta).toHaveFocus();
    expect(casuta).toHaveValue("125");
    expect(screen.getByTestId("valoare")).toHaveTextContent("125");
  });

  it("„1,5” e acceptată cu virgula, textul rămâne exact cum a fost tastat; litera e refuzată", async () => {
    const u = userEvent.setup();
    render(<Proba />);
    const casuta = screen.getByLabelText("Cantitate");
    await u.click(casuta);
    await u.keyboard("1,5");
    expect(casuta).toHaveFocus();
    expect(casuta).toHaveValue("1,5");
    await u.keyboard("x");
    expect(casuta).toHaveValue("1,5");
    await u.keyboard("0");
    expect(casuta).toHaveValue("1,50");
    expect(numarDinText("1,50")).toBe(1.5);
    expect(numarDinText("1.5")).toBe(1.5);
  });

  it("bucățile (intreg) nu primesc virgulă", async () => {
    const u = userEvent.setup();
    render(<Proba tip="intreg" />);
    const casuta = screen.getByLabelText("Cantitate");
    await u.click(casuta);
    await u.keyboard("1,5");
    expect(casuta).toHaveValue("15");
    expect(textCantitateValid("1,5", "intreg")).toBe(false);
    expect(textCantitateValid("1,5", "zecimal")).toBe(true);
    expect(textCantitateValid("", "zecimal")).toBe(true);
  });
});
