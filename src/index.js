const _ = require('lodash')

function aspectRatioDelta(width, height, originalWidth, originalHeight) {
  let coef = Math.min(originalWidth / width, originalHeight / height)
  let nWidth = width * coef
  let nHeight = height * coef
  if (nWidth + 0.001 < originalWidth) {
    return (nWidth) / originalWidth
  }
  return (nHeight) / originalHeight
}

function rowSquareDelta(validBlocks) {
  let result = 0

  validBlocks.forEach(o => {
    if (o == null)
      return
    let squareDelta = (o.width * o.height) / (o.originalWidth * o.originalHeight)
    if (squareDelta > 1)
      squareDelta = 1 / squareDelta
    result += squareDelta * Math.pow(aspectRatioDelta(o.width, o.height, o.originalWidth, o.originalHeight), 1)
  })
  return result
}


function findOptimalInRow(row, freeCoefficient, containerWidth) {
  if (row.length === 0) {
    return null
  }
  if (row.length === 1) {
    return [{ ...row[0], width: containerWidth*freeCoefficient }]
  }
  let validBlocks = row
  let optimizedMax = 0 //rowSquareDelta(row)
  for (let firstCoefficient = 0.05; firstCoefficient < freeCoefficient-row.length*0.05; firstCoefficient += 0.05) {
    let tailCoefficient = 1 - firstCoefficient
    let nValidBlocks = [{ ...row[0], firstCoefficient, width: containerWidth * firstCoefficient }, ...findOptimalInRow(_.tail(row), freeCoefficient-firstCoefficient, containerWidth)]
    let square = rowSquareDelta(nValidBlocks)
    if (square > optimizedMax) {
      optimizedMax = square
      validBlocks = nValidBlocks
    }
  }
  return validBlocks
}

function findOptimalInColumn(row, freeCoefficient, containerHeight) {
  if (row.length === 0) {
    return null
  }
  if (row.length === 1) {
    return [{ ...row[0], height: containerHeight*freeCoefficient }]
  }
  let validBlocks = row
  let optimizedMax = 0
  for (let firstCoefficient = 0.05; firstCoefficient < freeCoefficient-row.length*0.05; firstCoefficient += 0.05) {
    let tailCoefficient = 1 - firstCoefficient
    let nValidBlocks = [{ ...row[0], firstCoefficient, height: containerHeight * firstCoefficient }, ...findOptimalInColumn(_.tail(row), freeCoefficient-firstCoefficient, containerHeight)]
    let square = rowSquareDelta(nValidBlocks)
    if (square > optimizedMax) {
      optimizedMax = square
      validBlocks = nValidBlocks
    }
  }
  return validBlocks
}

module.exports.getFitVariants = function fit(blockArray, opts) {
  let variants = []
  if (!Array.isArray(blockArray) || blockArray.length === 0) {
    return []
  }

  // try all in row
  {
    let coefficient = 1
    let height = _.minBy(blockArray, (o) => o.height).height
    let validBlocks = blockArray.map(o => {
      return {
        ...o,
        originalWidth: o.width,
        originalHeight: o.height,
        width: height / o.height * o.width,
        height: height
      }
    })
    let width = _.sumBy(validBlocks, (o) => o.width)
    coefficient = opts.containerWidth / width
    let small = validBlocks.filter(o => o.width * coefficient < opts.containerWidth * 0.05)
    if (small.length > 0) {
      width = _.sumBy(validBlocks.filter(o => o.width * coefficient > opts.containerWidth * 0.05), (o) => o.width)
      coefficient = (opts.containerWidth - small.length * opts.containerWidth * 0.05) / width
    }

    validBlocks = findOptimalInRow(validBlocks.map(o => {
      return { ...o, width: Math.max(o.width * coefficient, opts.containerWidth * 0.05), height: Math.max(o.height * coefficient, opts.containerHeight * 0.1) }
    }), 1, opts.containerWidth)

    variants.push(
      {
        qualityCoefficient: rowSquareDelta(validBlocks),
        elements: validBlocks,
        containerWidth: _.sumBy(validBlocks, o => o.width),
        containerHeight: _.maxBy(validBlocks, o => o.height).height,
      }
    )
  }

  // try all in column
  {
    let coefficient = 1
    let width = _.minBy(blockArray, (o) => o.width).width
    let validBlocks = blockArray.map(o => {
      return { ...o, originalWidth: o.width, originalHeight: o.height, width: width, height: width / o.width * o.height }
    })
    let height = _.sumBy(validBlocks, (o) => o.height)
    coefficient = opts.containerHeight / height

    let small = validBlocks.filter(o=>o.height*coefficient<opts.containerHeight*0.05)
    if (small.length>0){
      height = _.sumBy(validBlocks.filter(o=>o.height*coefficient>opts.containerHeight*0.05), (o) => o.height)
      coefficient = (opts.containerHeight-small.length*opts.containerHeight*0.05)/height
    }

    validBlocks = findOptimalInColumn(validBlocks.map(o => {
      return { ...o, width: Math.max(o.width * coefficient,opts.containerWidth*0.05), height:Math.max( o.height * coefficient, opts.containerHeight*0.05)}
    }),1,opts.containerHeight)
    variants.push(
      {
        qualityCoefficient: rowSquareDelta(validBlocks),
        elements: validBlocks,
        containerWidth: _.maxBy(validBlocks, o => o.width).width,
        containerHeight: _.sumBy(validBlocks, o => o.height),
      }
    )
  }

  // try first and others in columns
  if (blockArray.length > 2) {
    let maxFirstWidth = 0.7
    let first = blockArray[0]
    let coefficient = Math.min(maxFirstWidth, opts.containerHeight / first.height)
    first = {
      ...first,
      originalWidth: first.width,
      originalHeight: first.height,
      width: opts.containerWidth * coefficient,
      height: opts.containerHeight
    }
    let width = opts.containerWidth * (1 - coefficient)
    let height = _.sumBy(_.tail(blockArray), (o) => o.height)
    let validBlocks = _.tail(blockArray).map(o => {
      return {
        ...o,
        originalWidth: o.width,
        originalHeight: o.height,
        width: width,
        height: opts.containerHeight / height * o.height
      }
    })
    // coefficient = opts.containerHeight/height
    let optimized = coefficient
    let optimum = 0

    for (let nCoef = 1 - maxFirstWidth; nCoef <= coefficient + 0.01; nCoef += 0.01) {
      let nFirst = { ...first, width: opts.containerWidth * nCoef }
      let nValidBlocks = _.tail(blockArray).map(o => {
        return {
          ...o,
          originalWidth: o.width,
          originalHeight: o.height,
          width: (1 - nCoef) * opts.containerWidth,
          height: opts.containerHeight / height * o.height
        }
      })
      nValidBlocks = findOptimalInColumn(nValidBlocks.map(o => {
        return { ...o, ar: aspectRatioDelta(o.width, o.height, o.originalWidth, o.originalHeight) }
      }),1,opts.containerHeight)
      let aR = rowSquareDelta([nFirst]) + rowSquareDelta(nValidBlocks)
      if (aR > optimum) {
        optimum = aR
        optimized = nCoef
        first = { ...nFirst }
        validBlocks = [...nValidBlocks]
      }
    }

    variants.push(
      {
        qualityCoefficient: rowSquareDelta([first]) + rowSquareDelta(validBlocks),
        elements: [first, ...validBlocks],
        containerWidth: first.width + _.maxBy(validBlocks, o => o.width).width,
        containerHeight: first.height,
      }
    )
  }

  // try all in two rows
  if (blockArray.length > 2) {
    for (let firstRowCount = 1; firstRowCount * 2 <= blockArray.length; firstRowCount++) {
      let firstRow = _.slice(blockArray, 0, firstRowCount)
      let firstRowMinHeight = _.minBy(firstRow, (o) => o.height).height
      let validBlocksFirstRow = firstRow.map(o => {
        return {
          ...o,
          originalWidth: o.width,
          originalHeight: o.height,
          width: firstRowMinHeight / o.height * o.width,
          height: firstRowMinHeight
        }
      })
      let firstRowWidth = _.sumBy(validBlocksFirstRow, (o) => o.width)
      let firstRowCoefficient = opts.containerWidth / firstRowWidth
      validBlocksFirstRow = validBlocksFirstRow.map(o => {
        return { ...o, width: o.width * firstRowCoefficient, height: o.height * firstRowCoefficient }
      })

      let secondRow = _.slice(blockArray, firstRowCount, blockArray.length)
      let secondRowMinHeight = _.minBy(secondRow, (o) => o.height).height
      let validBlocksSecondRow = secondRow.map(o => {
        return {
          ...o,
          originalWidth: o.width,
          originalHeight: o.height,
          width: secondRowMinHeight / o.height * o.width,
          height: secondRowMinHeight
        }
      })
      let secondRowWidth = _.sumBy(validBlocksSecondRow, (o) => o.width)
      let secondRowCoefficient = opts.containerWidth / secondRowWidth
      validBlocksSecondRow = validBlocksSecondRow.map(o => {
        return { ...o, width: o.width * secondRowCoefficient, height: o.height * secondRowCoefficient }
      })

      let totalHeight = _.maxBy(validBlocksFirstRow, (o) => o.height * firstRowCoefficient).height +
        _.maxBy(validBlocksSecondRow, (o) => o.height * secondRowCoefficient).height

      if (totalHeight > opts.containerHeight) {
        validBlocksFirstRow = validBlocksFirstRow.map(o => {
          return { ...o, height: o.height * opts.containerHeight / totalHeight }
        })
        validBlocksSecondRow = validBlocksSecondRow.map(o => {
          return { ...o, height: o.height * opts.containerHeight / totalHeight }
        })
      }
      let optimizedMax = 0// rowSquareDelta(validBlocksFirstRow) + rowSquareDelta(validBlocksSecondRow)

      for (let firstRowCoefficient = 0.1; firstRowCoefficient <= 0.9; firstRowCoefficient += 0.01) {
        let secondRowCoefficient = 1 - firstRowCoefficient
        let nValidBlocksFirstRow = findOptimalInRow(validBlocksFirstRow.map(o => {
          return { ...o, height: opts.containerHeight * firstRowCoefficient }
        }),1,opts.containerWidth)
        let nValidBlocksSecondRow = findOptimalInRow(validBlocksSecondRow.map(o => {
          return { ...o, height: opts.containerHeight * secondRowCoefficient }
        }),1,opts.containerWidth)

        let square = rowSquareDelta(nValidBlocksFirstRow) + rowSquareDelta(nValidBlocksSecondRow)
        if (square > optimizedMax) {
          optimizedMax = square
          validBlocksFirstRow = nValidBlocksFirstRow
          validBlocksSecondRow = nValidBlocksSecondRow
        }
      }

      variants.push(
        {
          qualityCoefficient: rowSquareDelta(validBlocksFirstRow) + rowSquareDelta(validBlocksSecondRow),
          elements: [
            ...validBlocksFirstRow,
            ...validBlocksSecondRow,
          ],
          containerWidth: _.sumBy(validBlocksFirstRow, o => o.width),
          containerHeight: _.maxBy(validBlocksFirstRow, o => o.height).height + _.maxBy(validBlocksSecondRow, o => o.height).height,
        }
      )
    }
  }

  // try all in three rows
  if (blockArray.length > 2) {
    for (let firstRowCount = 1; firstRowCount * 3 <= blockArray.length; firstRowCount++) {
      for (let secondRowCount = firstRowCount; secondRowCount <= blockArray.length - (firstRowCount + secondRowCount); secondRowCount++) {

        let firstRow = _.slice(blockArray, 0, firstRowCount)
        let firstRowMinHeight = _.minBy(firstRow, (o) => o.height).height
        let validBlocksFirstRow = firstRow.map(o => {
          return {
            ...o,
            originalWidth: o.width,
            originalHeight: o.height,
            width: firstRowMinHeight / o.height * o.width,
            height: firstRowMinHeight
          }
        })
        let firstRowWidth = _.sumBy(validBlocksFirstRow, (o) => o.width)
        let firstRowCoefficient = opts.containerWidth / firstRowWidth
        validBlocksFirstRow = validBlocksFirstRow.map(o => {
          return { ...o, width: o.width * firstRowCoefficient, height: o.height * firstRowCoefficient }
        })

        let secondRow = _.slice(blockArray, firstRowCount, firstRowCount + secondRowCount)
        let secondRowMinHeight = _.minBy(secondRow, (o) => o.height).height
        let validBlocksSecondRow = secondRow.map(o => {
          return {
            ...o,
            originalWidth: o.width,
            originalHeight: o.height,
            width: secondRowMinHeight / o.height * o.width,
            height: secondRowMinHeight
          }
        })
        let secondRowWidth = _.sumBy(validBlocksSecondRow, (o) => o.width)
        let secondRowCoefficient = opts.containerWidth / secondRowWidth
        validBlocksSecondRow = validBlocksSecondRow.map(o => {
          return { ...o, width: o.width * secondRowCoefficient, height: o.height * secondRowCoefficient }
        })

        let thirdRow = _.slice(blockArray, firstRowCount + secondRowCount, blockArray.length)
        let thirdRowMinHeight = _.minBy(thirdRow, (o) => o.height).height
        let validBlocksThirdRow = thirdRow.map(o => {
          return {
            ...o,
            originalWidth: o.width,
            originalHeight: o.height,
            width: thirdRowMinHeight / o.height * o.width,
            height: thirdRowMinHeight
          }
        })
        let thirdRowWidth = _.sumBy(validBlocksThirdRow, (o) => o.width)
        let thirdRowCoefficient = opts.containerWidth / thirdRowWidth
        validBlocksThirdRow = validBlocksThirdRow.map(o => {
          return { ...o, width: o.width * thirdRowCoefficient, height: o.height * thirdRowCoefficient }
        })

        let totalHeight = _.maxBy(validBlocksFirstRow, (o) => o.height * firstRowCoefficient).height +
          _.maxBy(validBlocksSecondRow, (o) => o.height * secondRowCoefficient).height +
          _.maxBy(validBlocksThirdRow, (o) => o.height * thirdRowCoefficient).height

        if (totalHeight > opts.containerHeight) {
          validBlocksFirstRow = validBlocksFirstRow.map(o => {
            return { ...o, height: o.height * opts.containerHeight / totalHeight }
          })
          validBlocksSecondRow = validBlocksSecondRow.map(o => {
            return { ...o, height: o.height * opts.containerHeight / totalHeight }
          })
          validBlocksThirdRow = validBlocksThirdRow.map(o => {
            return { ...o, height: o.height * opts.containerHeight / totalHeight }
          })
        }

        let optimizedMax = rowSquareDelta(validBlocksFirstRow) + rowSquareDelta(validBlocksSecondRow) + rowSquareDelta(validBlocksThirdRow)

        for (let firstRowCoefficient = 0.1; firstRowCoefficient <= 0.8; firstRowCoefficient += 0.01) {
          for (let secondRowCoefficient = 0.1; firstRowCoefficient + secondRowCoefficient <= 0.9; secondRowCoefficient += 0.01) {
            let thirdRowCoefficient = 1 - firstRowCoefficient - secondRowCoefficient
            let nValidBlocksFirstRow = findOptimalInRow(validBlocksFirstRow.map(o => {
              return { ...o, height: opts.containerHeight * firstRowCoefficient }
            }),1,opts.containerWidth)
            let nValidBlocksSecondRow = findOptimalInRow(validBlocksSecondRow.map(o => {
              return { ...o, height: opts.containerHeight * secondRowCoefficient }
            }),1,opts.containerWidth)
            let nValidBlocksThirdRow = findOptimalInRow(validBlocksThirdRow.map(o => {
              return { ...o, height: opts.containerHeight * thirdRowCoefficient }
            }),1,opts.containerWidth)

            let square = rowSquareDelta(nValidBlocksFirstRow) + rowSquareDelta(nValidBlocksSecondRow) + rowSquareDelta(nValidBlocksThirdRow)
            if (square > optimizedMax) {
              optimizedMax = square
              validBlocksFirstRow = nValidBlocksFirstRow
              validBlocksSecondRow = nValidBlocksSecondRow
              validBlocksThirdRow = nValidBlocksThirdRow
            }
          }
        }

        variants.push(
          {
            qualityCoefficient: rowSquareDelta(validBlocksFirstRow) + rowSquareDelta(validBlocksSecondRow) + rowSquareDelta(validBlocksThirdRow),
            elements: [
              ...validBlocksFirstRow,
              ...validBlocksSecondRow,
              ...validBlocksThirdRow
            ],
            containerWidth: _.sumBy(validBlocksFirstRow, o => o.width),
            containerHeight: _.maxBy(validBlocksFirstRow, o => o.height).height + _.maxBy(validBlocksSecondRow, o => o.height).height + _.maxBy(validBlocksThirdRow, o => o.height).height,
          }
        )
      }
    }
  }

  return variants
}

module.exports.fit = function (boxes, opts) {
  let variants = this.getFitVariants(boxes, opts)
  return _.maxBy(variants, o => o.qualityCoefficient)
}
