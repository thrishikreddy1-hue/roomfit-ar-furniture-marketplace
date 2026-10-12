# Optional product dimensions

Sellers can publish a product with width, depth and height all empty, or supply
only the measurements they know. The fields remain in the editor under
**Dimensions · optional** and can be completed later. A supplied measurement must
be a positive finite number in centimetres; blank measurements are stored as
`null`, never zero. Existing measurements are retained when an API update omits
the entire dimensions field.

Cards and product details show missing measurements honestly. The room-fit
calculator waits for complete measurements, and size filters exclude a product
if the requested measurement is unknown. AR models can still be previewed, but
the app warns that physical scale and fit are not verified without measurements.
