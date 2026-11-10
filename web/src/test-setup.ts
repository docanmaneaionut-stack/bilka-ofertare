import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// fara `globals`, testing-library nu demonteaza singura componentele intre teste
afterEach(() => cleanup());
