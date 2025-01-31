import { createFilterHandler } from '@picturas/filter-helper';
import { schemaValidation } from '@picturas/schema-validation';
import sharp from 'sharp';

const binarizationSchema = schemaValidation.object({
    threshold: schemaValidation.number().min(0).max(256).default(128),
});

async function binarizationHandler(imageBuffer, _, params) {
    const { threshold } = params;

    return sharp(imageBuffer).threshold(threshold).toBuffer();
}

createFilterHandler('binarization', false, binarizationSchema, binarizationHandler);
