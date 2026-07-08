import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist/", "coverage/", "node_modules/"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // "h" and "Fragment" are consumed by the classic JSX transform (jsxFactory in tsconfig),
      // which ESLint cannot see — treat them as used.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_|^h$|^Fragment$" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      // Adyen handler factories are called during render and capture refs in closures that only
      // run at event time (submit/click). The refs rule cannot see when the closure runs and
      // flags these as render-time reads — a false positive for this architecture.
      "react-hooks/refs": "off",
    },
  },
  {
    files: ["test/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  prettier
);
