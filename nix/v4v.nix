# Bitcoin/Lightning (V4V) dev environment: Nigiri + shell hook.
# Used by the root flake for devShells.v4v and devShells.v4v-fish.
# Isolated here so the main flake stays free of Lightning-specific logic.
{ pkgs
, system
, defaultBuildInputs
, defaultShellHook
}:
let
  # Nigiri - Bitcoin/Lightning regtest CLI (pre-built binary from GitHub releases)
  nigiriVersion = "0.5.16";
  nigiriSystems = {
    "x86_64-linux" = { os = "linux"; arch = "amd64"; sha256 = "0y30iwmkx0b4ph74ksiw3l0almcxzszdvnb5masb8ndhshmbgn0l"; };
    "aarch64-linux" = { os = "linux"; arch = "arm64"; sha256 = "051n2dd22f9rggwzw6xn5zkcjcb1750ypr9f9xr3jyzzd150mp1g"; };
    "x86_64-darwin" = { os = "darwin"; arch = "amd64"; sha256 = "1jqs1c9j8c56bx90i7gbfmjmp9wx9w3l2b5cf078hhh1xbb02a1d"; };
    "aarch64-darwin" = { os = "darwin"; arch = "arm64"; sha256 = "1crklxn4xs0951r1a0wp3dzajprjbkj9g0fyywgn7kr4zwdq7xk5"; };
  };
  nigiriSystem = nigiriSystems.${system} or null;
  nigiri =
    if nigiriSystem != null
    then
      pkgs.stdenv.mkDerivation {
        pname = "nigiri";
        version = nigiriVersion;
        src = pkgs.fetchurl {
          url = "https://github.com/vulpemventures/nigiri/releases/download/v${nigiriVersion}/nigiri-${nigiriSystem.os}-${nigiriSystem.arch}";
          sha256 = nigiriSystem.sha256;
        };
        dontUnpack = true;
        installPhase = ''
          mkdir -p $out/bin
          cp $src $out/bin/nigiri
          chmod +x $out/bin/nigiri
        '';
        meta = {
          description = "Bitcoin/Lightning regtest development environment";
          homepage = "https://github.com/vulpemventures/nigiri";
          license = pkgs.lib.licenses.mit;
          platforms = builtins.attrNames nigiriSystems;
        };
      }
    else null;

  v4vBuildInputs = defaultBuildInputs ++ (if nigiri != null then [ nigiri ] else [ ]);
  v4vShellHook = defaultShellHook + ''
    echo ""
    echo "V4V shell: Nigiri-enabled"
    echo "  make local_ln_up           # Start Lightning Network (Nigiri)"
  '' + (if nigiri == null then ''
    echo "Note: Nigiri not available for this platform via Nix."
    echo "Install manually: curl https://getnigiri.vulpem.com | bash"
  '' else "");
in
{
  buildInputs = v4vBuildInputs;
  shellHook = v4vShellHook;
}
