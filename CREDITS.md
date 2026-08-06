# Credits — Crystal Lattice

An interactive simulation of crystal structure: 2D Bravais lattices, the cubic systems,
close-packing, Miller indices, and aperiodic order.

## License

GNU Affero General Public License v3.0 or later — see [org LICENSE](https://github.com/OpenPhysics/.github/blob/main/LICENSE).

## Third-party code

### hatviz and the spectre visualizer — Craig S. Kaplan (BSD 3-Clause)

`src/common/model/EinsteinTiling.ts` is a TypeScript port of the hat outline, the H/T/P/F
metatile geometry, the 29-rule patch assembly and the supertile extraction from
[hatviz](https://github.com/isohedral/hatviz), together with the spectre outline from the
companion [spectre visualizer](https://cs.uwaterloo.ca/~csk/spectre/).

> BSD 3-Clause License
>
> Copyright (c) 2023, Craig S. Kaplan
>
> Redistribution and use in source and binary forms, with or without modification, are permitted
> provided that the following conditions are met:
>
> 1. Redistributions of source code must retain the above copyright notice, this list of conditions
>    and the following disclaimer.
> 2. Redistributions in binary form must reproduce the above copyright notice, this list of
>    conditions and the following disclaimer in the documentation and/or other materials provided
>    with the distribution.
> 3. Neither the name of the copyright holder nor the names of its contributors may be used to
>    endorse or promote products derived from this software without specific prior written
>    permission.
>
> THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
> IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
> FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
> CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
> DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
> DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
> IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
> OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## Scientific sources

- D. Smith, J. S. Myers, C. S. Kaplan and C. Goodman-Strauss, *An aperiodic monotile*
  ([arXiv:2303.10798](https://arxiv.org/abs/2303.10798), 2023) — the hat, its metatiles and their
  substitution system.
- D. Smith, J. S. Myers, C. S. Kaplan and C. Goodman-Strauss, *A chiral aperiodic monotile*
  ([arXiv:2305.17743](https://arxiv.org/abs/2305.17743), 2023) — the spectre.
- D. Shechtman, I. Blech, D. Gratias and J. W. Cahn, "Metallic Phase with Long-Range Orientational
  Order and No Translational Symmetry", *Phys. Rev. Lett.* **53**, 1951 (1984) — the measurement the
  Aperiodic Order screen reconstructs.
- C. Kittel, *Introduction to Solid State Physics* — lattice constants, coordination numbers and
  packing factors.
- W. D. Callister and D. G. Rethwisch, *Materials Science and Engineering: An Introduction* — the
  cubic-metal reference table in `src/common/model/elements.json`.

## Acknowledgments

Built with [SceneryStack](https://scenerystack.org/) as part of the
[OpenPhysics](https://github.com/OpenPhysics) fleet.
