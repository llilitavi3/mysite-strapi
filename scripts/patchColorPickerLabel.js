#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const targets = [
  path.join(
    process.cwd(),
    "node_modules",
    "@strapi",
    "plugin-color-picker",
    "dist",
    "admin",
    "components",
    "ColorPickerInput.js"
  ),
  path.join(
    process.cwd(),
    "node_modules",
    "@strapi",
    "plugin-color-picker",
    "dist",
    "admin",
    "components",
    "ColorPickerInput.mjs"
  ),
];

const replacements = [
  {
    from: `                /*#__PURE__*/ jsxRuntime.jsx(designSystem.Field.Label, {
                    action: labelAction,
                    children: label
                }),`,
    to: `                /*#__PURE__*/ jsxRuntime.jsxs(designSystem.Flex, {
                    alignItems: "center",
                    justifyContent: "space-between",
                    children: [
                        /*#__PURE__*/ jsxRuntime.jsx(designSystem.Typography, {
                            variant: "pi",
                            fontWeight: "bold",
                            children: label
                        }),
                        labelAction
                    ]
                }),`,
  },
  {
    from: `                /*#__PURE__*/ jsx(Field.Label, {
                    action: labelAction,
                    children: label
                }),`,
    to: `                /*#__PURE__*/ jsxs(Flex, {
                    alignItems: "center",
                    justifyContent: "space-between",
                    children: [
                        /*#__PURE__*/ jsx(Typography, {
                            variant: "pi",
                            fontWeight: "bold",
                            children: label
                        }),
                        labelAction
                    ]
                }),`,
  },
];

for (const target of targets) {
  if (!fs.existsSync(target)) continue;

  let content = fs.readFileSync(target, "utf8");
  const original = content;

  for (const { from, to } of replacements) {
    if (content.includes(from)) {
      content = content.replace(from, to);
    }
  }

  if (content !== original) {
    fs.writeFileSync(target, content, "utf8");
    console.log(`Patched: ${path.relative(process.cwd(), target)}`);
  }
}
