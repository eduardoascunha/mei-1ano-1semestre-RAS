import { createFilterHandler } from '@picturas/filter-helper';
import { schemaValidation } from '@picturas/schema-validation';
import sharp from 'sharp';

const rotationSchema = schemaValidation.object({
    angle: schemaValidation.number().min(-180).max(180),
});

async function rotationHandler(imageBuffer, _, params) {
    const { angle } = params;

    return sharp(imageBuffer).rotate(angle).toBuffer();
}

createFilterHandler('rotation', false, rotationSchema, rotationHandler);
