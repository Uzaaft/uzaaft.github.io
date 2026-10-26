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

    # Rush provides the persistent shell interpreter used by the terminal.
    # Its wasm target captures stdout/stderr and keeps shell state in memory.
    rush = {
      url = "github:uzaaft/rush";
      flake = false;
    };

    # Rush requires Zig 0.16; Ghostty requires Zig 0.17.
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
    rush,
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
      ghosttyZig = zig.packages.${system}."0.17.0";

      # zon2nix-generated fetchers for ghostty's build.zig.zon deps, so the
      # zig build runs offline. Upstream now copies packages into real
      # directories, avoiding Zig's lexical path issue with symlink farms.
      ghosttyDeps = pkgs.callPackage "${ghostty}/build.zig.zon.nix" {
        name = "ghostty-vt-wasm-deps";
        zig_0_17 = ghosttyZig;
      };

      # Fixed-output cache for Rush's build.zig.zon dependencies. The hash is
      # maintained by Rush's own Nix package; only the Zig package is supplied
      # here because this flake gets 0.16 from zig-overlay.
      rushDeps = pkgs.stdenvNoCC.mkDerivation {
        pname = "rush-wasm-deps";
        version = "0-unstable-${builtins.substring 0 7 (rush.rev or "dirty")}";
        src = rush;

        nativeBuildInputs = [zigPkg];
        dontInstall = true;

        buildPhase = ''
          mkdir -p "$out/tmp"
          export ZIG_GLOBAL_CACHE_DIR="$out"
          zig build --fetch --summary none
        '';

        outputHash = "sha256-Rpb0dEtm6Yq+5/Mg3RWvVzLH46NC1o/QvZL7jLYS9Vs=";
        outputHashMode = "nar";
      };
    in rec {
      ghostty-vt-wasm = pkgs.stdenv.mkDerivation {
        pname = "ghostty-vt-wasm";
        version = "0-unstable-${builtins.substring 0 7 (ghostty.rev or "dirty")}";
        src = ghostty;

        nativeBuildInputs = [ghosttyZig pkgs.binaryen];

        dontConfigure = true;
        doCheck = false;

        # -Dsimd=false is required, not a preference: simdutf fails to compile
        # for wasm32-freestanding. ghostty's own nix/libghostty-vt.nix hardcodes
        # simd=true and targets the host, which is why we can't just reuse it.
        #
        # -Dvt-features compiles out the C API surface the site never calls
        # (snapshot, formatter, selection, search, input encoding, color
        # utilities, and the custom glyph protocol).
        # The kept set is exactly what src/lib/vt/module.ts
        # validates at load: terminal lifecycle, vt_write, resize,
        # render_state, grid_ref hyperlinks, and Kitty image placement APIs.
        # Render-state color access is part of render-state; the standalone
        # color parsing and palette utilities are not needed. If a future site
        # feature needs another gated API, the build still succeeds but
        # module.ts's export check fails loudly at startup; re-enable the
        # matching feature here.
        # This pin still force-disables KIP on wasm for an old timestamp
        # dependency. Image generations now use a monotonic counter instead.
        # Direct transmission needs no OS clock or filesystem. Use Ghostty's
        # bundled Wuffs decoder for PNG rather than a synchronous JS callback.
        postPatch = ''
          substituteInPlace src/terminal/build_options.zig \
            --replace-fail 'if (target.os.tag == .freestanding) return false;' '_ = target;'
          substituteInPlace src/terminal/kitty/graphics_image.zig \
            --replace-fail '// Otherwise, the payload data is guaranteed to be a path.' \
              'if (comptime builtin.os.tag == .freestanding) return error.UnsupportedMedium;'
          substituteInPlace src/terminal/sys.zig \
            --replace-fail 'if (build_options.artifact == .lib) break :png null;' \
              '// This browser build includes Wuffs PNG decoding.'
        '';

        buildPhase = ''
          runHook preBuild

          export XDG_CACHE_HOME="$TMPDIR/zig-cache"
          zig build \
            --system "${ghosttyDeps}" \
            -Doptimize=ReleaseSmall \
            -Dapp-runtime=none \
            -Demit-lib-vt=true \
            -Dtarget=wasm32-freestanding \
            -Dsimd=false \
            -Dvt-features=-all,+render-state,+grid-introspection,+kitty-graphics

          runHook postBuild
        '';

        # wasm-opt -Oz shaves ~11% off the zig linker output (mostly dead
        # locals and CFG simplification LLVM leaves behind). --converge
        # repeats the size pass until no further reduction is possible. The
        # feature flags enumerate what Zig emits for this target (see the
        # target_features section of an unstripped build). --detect-features
        # finds nothing because release builds strip that section. If a zig
        # upgrade adds a feature, wasm-opt's validator fails the build loudly
        # rather than silently miscompiling; extend the list then.
        installPhase = ''
          runHook preInstall
          wasm-opt -Oz --converge \
            --enable-bulk-memory \
            --enable-extended-const \
            --enable-multivalue \
            --enable-mutable-globals \
            --enable-nontrapping-float-to-int \
            --enable-sign-ext \
            --enable-simd \
            --enable-call-indirect-overlong \
            zig-out/bin/ghostty-vt.wasm -o ghostty-vt-opt.wasm
          install -Dm444 ghostty-vt-opt.wasm "$out/ghostty-vt.wasm"
          runHook postInstall
        '';

        meta = {
          description = "libghostty-vt built for wasm32-freestanding";
          homepage = "https://github.com/ghostty-org/ghostty";
        };
      };

      rush-wasm = pkgs.stdenv.mkDerivation {
        pname = "rush-wasm";
        version = "0-unstable-${builtins.substring 0 7 (rush.rev or "dirty")}";
        src = rush;
        patches = [./nix/rush-shell-features.patch];

        nativeBuildInputs = [zigPkg pkgs.binaryen];

        dontConfigure = true;
        doCheck = false;

        buildPhase = ''
          runHook preBuild

          export ZIG_GLOBAL_CACHE_DIR="$TMPDIR/zig-cache"
          mkdir -p "$ZIG_GLOBAL_CACHE_DIR"
          ln -s ${rushDeps}/p "$ZIG_GLOBAL_CACHE_DIR/p"
          zig build \
            -Dtarget=wasm32-freestanding \
            -Doptimize=ReleaseSmall \
            -Dshell-features=-history,-printf-float

          runHook postBuild
        '';

        # The wasm embedding target already omits the native UI, SQLite,
        # process execution, and job control. The custom patch also removes
        # history/fc/z (history is owned by the site) and floating-point printf
        # conversions. String/integer printf and the shell language stay intact.
        installPhase = ''
          runHook preInstall
          wasm-opt -Oz --converge \
            --enable-bulk-memory \
            --enable-extended-const \
            --enable-multivalue \
            --enable-mutable-globals \
            --enable-nontrapping-float-to-int \
            --enable-sign-ext \
            --enable-simd \
            --enable-call-indirect-overlong \
            zig-out/bin/rush.wasm -o rush-opt.wasm
          install -Dm444 rush-opt.wasm "$out/rush.wasm"
          runHook postInstall
        '';

        meta = {
          description = "Rush shell built for wasm32-freestanding";
          homepage = "https://github.com/uzaaft/rush";
        };
      };

      default = pkgs.stdenv.mkDerivation {
        pname = "uzaaft-github-io";
        version = "0.0.1";
        src = ./.;

        env.CI = "true";

        # pnpm must be listed explicitly: the top-level pnpmConfigHook no
        # longer propagates the pnpm binary, and buildPhase calls `pnpm build`.
        nativeBuildInputs = [
          pkgs.nodejs
          pkgs.pnpm
          pkgs.pnpmConfigHook
        ];

        # fetcherVersion 4 is required here, not 3: pkgs.pnpm is pnpm 11 and
        # the v3 fetcher output is rejected for pnpm >= 11. The hash changes
        # with the fetcher version and with any pnpm major bump (store format),
        # so regenerate it by rebuilding with pkgs.lib.fakeSha256.
        pnpmDeps = pkgs.fetchPnpmDeps {
          pname = "uzaaft-github-io-pnpm-deps";
          src = ./.;
          pnpm = pkgs.pnpm;
          fetcherVersion = 4;
          hash = "sha256-jsQC+IhH4kmI1GfuWcCJHeb+1JHo1ShIZZsA2pYgPGk=";
        };

        # The wasm is gitignored (generated, not committed), so it is absent
        # from the flake source and must be copied in from its derivation.
        # This lives inside buildPhase rather than preBuild because overriding
        # buildPhase as a string skips stdenv's runHook preBuild entirely.
        buildPhase = ''
          runHook preBuild

          install -m644 ${ghostty-vt-wasm}/ghostty-vt.wasm src/lib/vt/ghostty-vt.wasm
          install -m644 ${rush-wasm}/rush.wasm static/rush.wasm
          pnpm build

          runHook postBuild
        '';
        # adapter-static writes a servable tree (including the wasm copied in
        # during buildPhase) straight to ./build.
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
