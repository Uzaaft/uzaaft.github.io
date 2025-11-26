{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    systems.url = "github:nix-systems/default";
  };

  outputs = {
    systems,
    nixpkgs,
    ...
  } @ inputs: let
    eachSystem = f: nixpkgs.lib.genAttrs (import systems) (system: f nixpkgs.legacyPackages.${system});
  in {
    packages = eachSystem (pkgs: {
      default = pkgs.stdenv.mkDerivation {
        pname = "uzaaft-github-io";
        version = "0.0.1";
        src = ./.;

        nativeBuildInputs = [
          pkgs.nodejs
          pkgs.pnpm.configHook
        ];

        pnpmDeps = pkgs.pnpm.fetchDeps {
          pname = "uzaaft-github-io-pnpm-deps";
          src = ./.;
          lockfile = ./pnpm-lock.yaml;
          fetcherVersion = 2;
          hash = "sha256-PjHxlpHr1OxB3BKV7jhIyWSTzojlsjvzFTYEHg/+nB4=";
        };

        buildPhase = "pnpm build";
        installPhase = "mv dist $out";
      };
    });

    devShells = eachSystem (pkgs: {
      default = pkgs.mkShell {
        buildInputs = with pkgs; [
          nodejs
          pnpm
          pandoc
          texliveFull
          astro-language-server
        ];

        shellHook = ''
          export PATH=$PWD/node_modules/.bin:$PATH
        '';
      };
    });
  };
}
