/**
 * Prettier nos defaults (semi, aspas duplas, printWidth 80, trailingComma "all"),
 * só acrescentando o plugin que ordena as classes do Tailwind/shadcn.
 * O plugin do Tailwind DEVE ser o último da lista.
 *
 * @type {import("prettier").Config & import("prettier-plugin-tailwindcss").PluginOptions}
 */
const config = {
  plugins: ["prettier-plugin-tailwindcss"],
};

export default config;
