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
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs =
            with pkgs;
            [
              # Node.js and npm (v24 for monorepo development)
              nodejs_24
              prettier

              # Container and orchestration tools
              argocd
              kompose
              kubectl
              kubernetes-helm
              kustomize

              # Database and cache tools
              postgresql
              redis
              sqlite

              # DevOps and configuration
              git
              sops
              yq
              yamllint
              jq

              # Kubernetes utilities
              k9s

              # Development utilities
              curl
              gnumake
              pkg-config
              openssl
              moreutils
              pwgen
              libuuid
            ]
            ++ (
              if pkgs.stdenv.isLinux then
                [
                  docker
                  docker-compose
                ]
              else
                [
                  # On macOS, use Docker Desktop instead
                ]
            );

          shellHook = ''
            echo "🛠️  Podverse Monorepo Development Environment"
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
            echo "For Kubernetes management:"
            echo "  Ensure your KUBECONFIG is set (usually ~/.kube/config or /etc/rancher/k3s/k3s.yaml)"
          '';
        };
      }
    );
}
