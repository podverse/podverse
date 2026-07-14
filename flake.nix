{
  description = "Podverse Environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    sops-nix.url = "github:Mic92/sops-nix";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      sops-nix,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        defaultBuildInputs =
          with pkgs;
          [
            bash
            nodejs_24
            prettier
            argocd
            kompose
            kubectl
            kubernetes-helm
            kustomize
            postgresql
            redis
            sqlite
            git
            sops
            yq
            yamllint
            jq
            k9s
            curl
            gnumake
            pkg-config
            openssl
            moreutils
            pwgen
            libuuid
            eslint
            maestro
          ]
          ++ (
            if pkgs.stdenv.isLinux then
              [
                docker
                docker-compose
              ]
            else
              [ ]
          );

        defaultShellHook = ''
          echo "Podverse Monorepo Development Environment"
          echo ""
          echo "Quick Start:"
          echo "  npm install                # Install dependencies"
          echo "  npm run build:packages     # Build all packages"
          echo "  npm run dev:all            # Start all services"
          echo ""
          echo "Services:"
          echo "  make local_db_up           # Start PostgreSQL"
          echo "  make local_mq_up           # Start RabbitMQ"
          echo "  make local_keyvaldb_up     # Start Redis"
          echo ""
          echo "Full E2E (with Lightning):"
          echo "  nix develop .#v4v          # Enter V4V shell (includes Nigiri)"
          echo "  make local_nuke_rebuild_run_v4v  # Full rebuild with V4V/Lightning"
          echo ""
          echo "For Kubernetes management:"
          echo "  Ensure your KUBECONFIG is set (usually ~/.kube/config or /etc/rancher/k3s/k3s.yaml)"
        '';

        # V4V/Lightning shells: Nigiri and hook live in nix/v4v.nix to keep this flake minimal.
        v4v = import ./nix/v4v.nix {
          inherit
            pkgs
            system
            defaultBuildInputs
            defaultShellHook
            ;
        };

      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = defaultBuildInputs;
          shellHook = defaultShellHook;
        };

        # V4V environment (opt-in): includes Nigiri for local Lightning regtest.
        # Use: nix develop .#v4v   (Bitcoin/Lightning config in nix/v4v.nix)
        # Drops into fish so the same shell is used as in the default dev environment.
        devShells.v4v = pkgs.mkShell {
          buildInputs = v4v.buildInputs ++ [ pkgs.fish ];
          shellHook = v4v.shellHook + ''
            exec fish
          '';
        };

        # Same environment but drops you into fish instead of bash.
        # Use: nix develop .#fish
        devShells.fish = pkgs.mkShell {
          buildInputs = defaultBuildInputs ++ [ pkgs.fish ];
          shellHook = defaultShellHook + ''
            exec fish
          '';
        };

        # Same as v4v shell, but drops you into fish.
        # Use: nix develop .#v4v-fish
        devShells.v4v-fish = pkgs.mkShell {
          buildInputs = v4v.buildInputs ++ [ pkgs.fish ];
          shellHook = v4v.shellHook + ''
            exec fish
          '';
        };
      }
    );
}
