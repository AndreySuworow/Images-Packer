# Images-Packer
JS Lib to fit images in box in a most elegant way.

## How to use
### Installation
If you are using NPM:
`npm install images-packer`

Or if you are using Yarn:
`yarn add images-packer`

### Usage
1. Import package
```javascript
import * as ImagesPacker from 'images-packer'
// or
const ImagesPacker = require('images-packer')
```
2. Create an array of objects with your images. All objects *must* contain `width` and `height` attributes.
```javascript
let blocks = [
  {
    width: 749,
    height: 500,
    url: 'https://example.com/img1.jpg'
  },
  {
    width: 2436,
    height: 1125,
    url: 'https://example.com/img2.jpg'
  },
  {
    width: 2152,
    height: 66,
    url: 'https://example.com/img3.jpg'
  },
  {
    width: 35,
    height: 35,
    url: 'https://example.com/img4.jpg'
  }
]
```
3. Pass created array of objects to a function
```javascript
// Get optimal packing variant
let packedImages = ImagesPacker.fit(blocks,
        {
          containerWidth: 640,
          containerHeight: 440
        })
        
// Get all packing variants
let packedImagesVariants = ImagesPacker.getFitVariants(blocks,
        {
          containerWidth: 640,
          containerHeight: 440
        })
```
