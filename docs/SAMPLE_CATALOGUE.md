# Sample furniture catalogue

The owner requested eight illustrative furniture listings and three sample showrooms for the public website. They are marked `isSample: true`, with names and badges identifying them as samples. They are not for sale and cannot receive sales enquiries. No public demo seller or admin credentials are created.

Definitions are in `backend/src/sampleCatalogue.js`. Records are added only when their `sample-` IDs are absent. Existing shops, products, accounts, and enquiries must be preserved. The destructive `seed` script is not used.

## Asset credits

The unmodified models and screenshots are referenced from [Khronos glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets). Listed dimensions describe the illustrative catalogue, not a sales specification. Product pages show source and license links.

| Asset | Credit | License |
| --- | --- | --- |
| [GlamVelvetSofa](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlamVelvetSofa) | Wayfair, LLC, 2021; Eric Chadwick | CC BY 4.0 |
| [SheenWoodLeatherSofa](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenWoodLeatherSofa) | Fran Calvente, 2021, original; Darmstadt Graphics Group GmbH / Eric Chadwick, 2024, improvements | Original CC0; improvements CC BY 4.0 |
| [SpecularSilkPouf](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SpecularSilkPouf) | Wayfair, LLC, 2023; Eric Chadwick | CC BY 4.0 |
| [SheenChair](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenChair) | Wayfair, LLC, 2020; Eric Chadwick | CC0 |
| [ChairDamaskPurplegold](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/ChairDamaskPurplegold) | Wayfair, 2021; Eric Chadwick | CC BY 4.0 |
| [AnisotropyBarnLamp](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/AnisotropyBarnLamp) | Wayfair, LLC, 2023; Eric Chadwick | CC BY 4.0 |
| [IridescenceLamp](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/IridescenceLamp) | Wayfair, LLC, 2022; Eric Chadwick | CC BY 4.0 |
| [GlassVaseFlowers](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlassVaseFlowers) | Eric Chadwick, glass vase; Rico Cilliers, flowers; 2023 | CC0 |

License texts: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) and [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

Photos and models currently load from their source URLs. New real seller uploads continue to use the connected Vercel Blob store.
