{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    systems.url = "github:nix-systems/default";

    # libghostty-vt, compiled to wasm, paints the terminal grid on the site.
    # flake.lock is the pin; bump deliberately with `nix flake update ghostty`:
    # lib_vt.zig warns the C API may change without warning pre-1.0, and we
    # read struct layouts out of it at runtime.
    ghostty = {
      url = "github:ghostty-org/ghostty";
      flake = false;
    };

    # nixpkgs pin predates Zig 0.16, which ghostty requires.
    zig = {
      url = "github:mitchellh/zig-overlay";
      inputs = {
        nixpkgs.follows = "nixpkgs";
        systems.follows = "systems";
      };
    };
  };

  outputs = {
    systems,
    nixpkgs,
    ghostty,
    zig,
    ...
  } @ inputs: let
    eachSystem = f:
      nixpkgs.lib.genAttrs (import systems) (
        system: f nixpkgs.legacyPackages.${system} system
      );
  in {
    packages = eachSystem (pkgs: system: let
      zigPkg = zig.packages.${system}."0.16.0";

      # zon2nix-generated fetchers for ghostty's build.zig.zon deps, so the
      # zig build runs offline. The copy-farm override is ghostty's own
      # workaround: zig's build runner computes paths lexically, so a symlink
      # that resolves to a different depth breaks the build.
      # See https://codeberg.org/ziglang/zig/issues/32121
      ghosttyDeps = pkgs.callPackage "${ghostty}/build.zig.zon.nix" {
        name = "ghostty-vt-wasm-deps";
        zig_0_16 = zigPkg;
        linkFarm = name: entries:
          pkgs.runCommand name {} ''
            mkdir -p $out
            ${pkgs.lib.concatMapStringsSep "\n" (e: ''
                cp -rL ${e.path} $out/${e.name}
              '')
              entries}
          '';
      };
    in rec {
      ghostty-vt-wasm = pkgs.stdenv.mkDerivation {
        pname = "ghostty-vt-wasm";
        version = "0-unstable-${builtins.substring 0 7 (ghostty.rev or "dirty")}";
        src = ghostty;

        nativeBuildInputs = [zigPkg];

        dontConfigure = true;
        doCheck = false;

        # -Dsimd=false is required, not a preference: simdutf fails to compile
        # for wasm32-freestanding. ghostty's own nix/libghostty-vt.nix hardcodes
        # simd=true and targets the host, which is why we can't just reuse it.
        buildPhase = ''
          runHook preBuild

          export XDG_CACHE_HOME="$TMPDIR/zig-cache"
          zig build \
            --system "${ghosttyDeps}" \
            -Doptimize=ReleaseSmall \
            -Dapp-runtime=none \
            -Demit-lib-vt=true \
            -Dtarget=wasm32-freestanding \
            -Dsimd=false

          runHook postBuild
        '';

        installPhase = ''
          runHook preInstall
          install -Dm444 zig-out/bin/ghostty-vt.wasm "$out/ghostty-vt.wasm"
          runHook postInstall
        '';

        meta = {
          description = "libghostty-vt built for wasm32-freestanding";
          homepage = "https://github.com/ghostty-org/ghostty";
        };
      };

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
          hash = "sha256-8E4Wzrya/+9vVHZw4AXvnR+tk7Avu7m+XomU39nWggU=";
        };

        # The wasm is gitignored (generated, not committed), so it is absent
        # from the flake source and must be copied in from its derivation.
        # This lives inside buildPhase rather than preBuild because overriding
        # buildPhase as a string skips stdenv's runHook preBuild entirely.
        buildPhase = ''
          runHook preBuild

          install -m644 ${ghostty-vt-wasm}/ghostty-vt.wasm static/ghostty-vt.wasm
          pnpm build

          runHook postBuild
        '';
        # adapter-static writes a servable tree (including CNAME and the wasm
        # copied in by preBuild) straight to ./build.
        installPhase = "mv build $out";
      };
    });

    devShells = eachSystem (pkgs: system: {
      default = pkgs.mkShell {
        buildInputs = [
          zig.packages.${system}."0.16.0"
          pkgs.nodejs
          pkgs.pnpm
          pkgs.pandoc
          pkgs.texliveFull
          pkgs.svelte-language-server
        ];

        shellHook = ''
          export PATH=$PWD/node_modules/.bin:$PATH
        '';
      };
    });
  };
}
