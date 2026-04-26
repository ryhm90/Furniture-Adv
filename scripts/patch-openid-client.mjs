import fs from "node:fs";
import path from "node:path";

const packageRoot = process.cwd();
const openIdClientRoot = path.join(packageRoot, "node_modules", "openid-client");
const packageJsonPath = path.join(openIdClientRoot, "package.json");

if (!fs.existsSync(packageJsonPath)) {
  console.log("[patch-openid-client] openid-client not installed, skipping.");
  process.exit(0);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

if (!String(packageJson.version).startsWith("5.")) {
  console.log(
    `[patch-openid-client] openid-client ${packageJson.version} does not need this patch, skipping.`,
  );
  process.exit(0);
}

const fileReplacements = [
  {
    file: "lib/client.js",
    replacements: [
      {
        from: "const url = require('url');\nconst { URL, URLSearchParams } = require('url');\n",
        to: "const { URL, URLSearchParams } = require('url');\n",
      },
      {
        from: `function getSearchParams(input) {
  const parsed = url.parse(input);
  if (!parsed.search) return {};
  return querystring.parse(parsed.search.substring(1));
}
`,
        to: `function getSearchParams(input) {
  const parsed = new URL(input, 'http://localhost');
  if (!parsed.search) return {};
  return querystring.parse(parsed.search.substring(1));
}
`,
      },
      {
        from: `    const target = url.parse(this.issuer.end_session_endpoint);
    const query = defaults(
      getSearchParams(this.issuer.end_session_endpoint),
      params,
      {
        post_logout_redirect_uri,
        client_id: this.client_id,
      },
      { id_token_hint },
    );

    Object.entries(query).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        delete query[key];
      }
    });

    target.search = null;
    target.query = query;

    return url.format(target);
`,
        to: `    const target = new URL(this.issuer.end_session_endpoint);
    const query = defaults(
      getSearchParams(this.issuer.end_session_endpoint),
      params,
      {
        post_logout_redirect_uri,
        client_id: this.client_id,
      },
      { id_token_hint },
    );

    target.search = '';

    Object.entries(query).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      if (Array.isArray(value)) {
        target.searchParams.delete(key);
        value.forEach((member) => target.searchParams.append(key, String(member)));
        return;
      }

      target.searchParams.set(key, String(value));
    });

    return target.toString();
`,
      },
    ],
  },
  {
    file: "lib/issuer.js",
    replacements: [
      {
        from: "const url = require('url');\n",
        to: "const { URL } = require('url');\n",
      },
      {
        from: "  const { host } = url.parse(resource);\n",
        to: "  const { host } = new URL(resource);\n",
      },
      {
        from: `function resolveWellKnownUri(uri) {
  const parsed = url.parse(uri);
  if (parsed.pathname.includes('/.well-known/')) {
    return uri;
  } else {
    let pathname;
    if (parsed.pathname.endsWith('/')) {
      pathname = \`\${parsed.pathname}.well-known/openid-configuration\`;
    } else {
      pathname = \`\${parsed.pathname}/.well-known/openid-configuration\`;
    }
    return url.format({ ...parsed, pathname });
  }
}
`,
        to: `function resolveWellKnownUri(uri) {
  const parsed = new URL(uri);
  if (parsed.pathname.includes('/.well-known/')) {
    return uri;
  }

  if (parsed.pathname.endsWith('/')) {
    parsed.pathname = \`\${parsed.pathname}.well-known/openid-configuration\`;
  } else {
    parsed.pathname = \`\${parsed.pathname}/.well-known/openid-configuration\`;
  }

  return parsed.toString();
}
`,
      },
    ],
  },
  {
    file: "lib/passport_strategy.js",
    replacements: [
      {
        from: "const url = require('url');\n",
        to: "const { URL } = require('url');\n",
      },
      {
        from: "  this._key = sessionKey || `oidc:${url.parse(this._issuer.issuer).hostname}`;\n",
        to: "  this._key = sessionKey || `oidc:${new URL(this._issuer.issuer).hostname}`;\n",
      },
      {
        from: "  this.name = url.parse(client.issuer.issuer).hostname;\n",
        to: "  this.name = new URL(client.issuer.issuer).hostname;\n",
      },
    ],
  },
];

let touchedFiles = 0;

for (const { file, replacements } of fileReplacements) {
  const filePath = path.join(openIdClientRoot, file);
  let content = fs.readFileSync(filePath, "utf8");
  let updated = content;

  for (const { from, to } of replacements) {
    if (updated.includes(to)) {
      continue;
    }

    if (!updated.includes(from)) {
      throw new Error(`[patch-openid-client] Expected snippet not found in ${file}`);
    }

    updated = updated.replace(from, to);
  }

  if (updated !== content) {
    fs.writeFileSync(filePath, updated);
    touchedFiles += 1;
  }
}

console.log(`[patch-openid-client] patched ${touchedFiles} file(s).`);
