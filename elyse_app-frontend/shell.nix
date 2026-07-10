{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs
    pkgs.nodePackages.npm
    pkgs.nodePackages.typescript
    pkgs.git
    pkgs.yarn
  ];

  shellHook = ''
    npm install
  '';
}

