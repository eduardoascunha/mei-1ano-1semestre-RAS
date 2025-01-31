import { Router } from 'express';
import {
    addImage,
    addProject,
    addTool,
    countImagesInProject,
    countProjects,
    deleteProject,
    downloadImageLocally,
    filterProject,
    getProject,
    getProjects,
    removeImage,
    removeTool,
    reorderImage,
    reorderTool,
    updateProject,
} from '../controller/project.js';
import { queryProjectSchema } from '../models/queryProject.js';
import { schemaValidation, validateRequest } from '@picturas/schema-validation';
import schemas from '../utils/filters.js';
import multer from '../config/multerConfig.js';
import { getLimitsMiddleware } from '../utils/premium.js';
import { addProjectToPipeline, isUserLimitReached } from '../controller/pipeline.js';
import { cancelPipeline, runPipeline, runPreview, setHooks } from '../utils/filterCall.js';

setHooks(downloadImageLocally);

const router = Router();
router.use(getLimitsMiddleware);

router.post('/', validateRequest({
    body: schemaValidation.object({
        name: schemaValidation.string()
    })
}), async (req, res) => {
    try {
        const data = {
            ...req.body,
            userId: req.user._id
        }

        if (req.user.limits.hasTtl) {
            data.ttl = req.user.limits.ttlStartTime;
        }

        const numProjects = await countProjects(req.user._id);
        if (numProjects >= req.user.limits.projectsLimit){
            return res.status(412).json({error: "Limit of projects reached"})
        }

        const project = await addProject(data);
        return res.status(200).json(await filterProject(project));
    } catch (error) {
        return res.status(500).json({ error: 'Failed to add project' });
    }
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const project = await getProject(req.user._id, id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        return res.status(200)
            .json(await filterProject(project));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

router.get('/', validateRequest({
    query: queryProjectSchema
}, { strict: false }), async (req, res) => {
    const { query } = req;

    try {
        const projects = await getProjects(req.user._id, query);
        if (!projects) {
            return res.status(404).json({ error: 'Projects not found' });
        }
        return res.status(200)
            .json(await Promise.all(projects.map(async (p) => await filterProject(p))));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

router.put('/:id', validateRequest({
    body: schemaValidation.object({
        name: schemaValidation.string()
    }),
}), async (req, res) => {
    const { id } = req.params;
    const { body } = req;

    try {
        await updateProject(req.user._id, id, body);
        const project = await getProject(req.user._id, id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        return res.status(200)
            .json(await filterProject(project));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const project = await deleteProject(req.user._id, id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        return res.sendStatus(200)
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

//////////////////////////////////////////////////////////////////////////////////////////
// Tools
//////////////////////////////////////////////////////////////////////////////////////////

router.post('/:id/tool', validateRequest({
    body: schemaValidation.object({
        filterName: schemaValidation.enum(Object.keys(schemas)),
        args: schemaValidation.unknown(),
    })
    .strict()
    .refine((data) => {
        return schemas[data.filterName].schema.safeParse(data.args).success
    })
}, {strict: false}), async (req, res) => {
    const { id } = req.params;
    const toolInformation = req.body;

    const isToolPremium = schemas[toolInformation.filterName].isPremium;

    if (isToolPremium && !req.user.isPremium) {
        return res.status(402).json({ error: 'You need to be premium to use this tool' });
    }

    try {
        const index = await addTool(req.user._id, id, toolInformation);
        return res.status(200).json({index})
    } catch(error) {
        return res.status(500).json({ error: error.message });
    }
})

router.delete('/:id/tool/:idxTool', async (req, res) => {
    const { id, idxTool } = req.params;

    try {
        const { project, removedTool } = await removeTool(req.user._id, id, idxTool);
        return res.status(200).json({
            project,
            removedTool
        });
    } catch(error) {
        return res.status(500).json({ error: error.message });
    }
})

router.put('/:id/tool/:idxTool', validateRequest({
  body: schemaValidation.object({
    idxToolAfter: schemaValidation.number().min(0)
  })
}), async (req, res) => {
    const { id, idxTool } = req.params;
    const { idxToolAfter } = req.body;

    try {
        const { reorderedTool, toolIdx } = await reorderTool(req.user._id, id, idxTool, idxToolAfter);
        return res.status(200).json({
            reorderedTool,
            toolIdx
        });
    } catch(error) {
        return res.status(500).json({ error: error.message });
    }
})

//////////////////////////////////////////////////////////////////////////////////////////
// Images
//////////////////////////////////////////////////////////////////////////////////////////

router.post('/:id/image', multer.single('projectImage'), async (req, res) => {
    const { id } = req.params;
    const image = req.file;
    const userLimits = req.user.limits;

    if (!image) {
        return res.status(400).json({error: 'No image uploaded'});
    }

    try {
        const numImages = await countImagesInProject(req.user._id, id);
        if (numImages >= req.user.limits.imagesLimit){
            return res.status(412).json({error: "Limit of images reached"})
        }

        const { imageIdx, imageUrl } = await addImage(req.user._id, id, image, userLimits);
        return res.status(200).json({
            id: imageIdx,
            imageUrl
        })
    } catch(error) {
        return res.status(500).json({ error: error.message });
    }
})

router.put('/:id/image/:idxImage', validateRequest({
    body: schemaValidation.object({
      idxImageAfter: schemaValidation.number().min(0)
    })
  }), async (req, res) => {
      const { id, idxImage } = req.params;
      const { idxImageAfter } = req.body;

    try {
          const { reorderedImage, imageIdx } = await reorderImage(req.user._id, id, idxImage, idxImageAfter);
          return res.status(200).json({
              reorderedImage,
              imageIdx
          });
      } catch(error) {
          return res.status(500).json({ error: error.message });
      }
  })

router.delete('/:id/image/:idxImage', async (req, res) => {
    const { id, idxImage } = req.params;

    try {
        const removedImage = await removeImage(req.user._id, id, idxImage);
        return res.status(200).json({removedImage});
    } catch(error) {
        return res.status(500).json({ error: error.message });
    }
})

////////////////////////////////////////////////////////////////////////////
// Process a project
///////////////////////////////////////////////////////////////////////////

router.post('/:id/process', async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
    const userLimits = req.user.limits;

    try {
        const isLimitReached = await isUserLimitReached(userId, userLimits);
        if (isLimitReached)
            return res.status(429).json({
                message: 'Daily limit reached'
            })

        await addProjectToPipeline(userId, id, userLimits);
        const project = await getProject(userId, id);

        const tools = project.tools.map(tool => ({filterName: tool._doc.filterName, args: tool._doc.args ?? {}}));
        await runPipeline(userId, id, project.images, tools, !req.user.limits.noWatermark)

        res.status(200).json({
            message: 'Pipeline processing started.',
        });
    } catch (error) {
        return res.status(500).json({ message: `Error processing pipeline: ${error.message}` });
    }
});

router.post('/:id/preview', validateRequest({
    body: schemaValidation.object({
        imageIdx: schemaValidation.number().min(0)
    })
}), async (req, res) => {
    const { id } = req.params;
    const {imageIdx} = req.body;
    const userId = req.user._id;
    const userLimits = req.user.limits;

    try {
        const project = await getProject(req.user._id, id);
        await addProjectToPipeline(userId, id, userLimits);

        if (project.images.length <= imageIdx || 0 > imageIdx) {
            return res.status(404).json({ message: `The specified image does not exist` });
        }

        const image = await project.images[imageIdx]

        await runPreview(userId, id, image, project.tools, !req.user.limits.noWatermark)

        res.status(200).json({
            message: 'Pipeline processing started.',
        });
    } catch (error) {
        res.status(500).json({ message: `Error processing pipeline: ${error.message}` });
    }
});

router.delete('/:id/process', async (req, res) => {
    const { id } = req.params;

    try {
        await cancelPipeline(id);

        res.status(200).json({
            message: 'Pipeline processing canceled.',
        });
    } catch (error) {
        res.status(500).json({ message: `Error processing pipeline: ${error.message}` });
    }

});

export default router;
