import {Router, Request, Response} from 'express';
import pool from '../config/database';
import authenticateToken, { AuthRequest } from '../middleware/auth';

const router = Router();

export default router;

// GET/api/waypoints
router.get('/', authenticateToken, async(req: AuthRequest, res: Response) => {
    const {realm_id, dimension} = req.query;

    if(!realm_id){
        return res.status(400).json({error: 'realm_id is required'});
    }
    
    try{
        let query = 'SELECT * FROM waypoints WHERE realm_id = $1';
        const params: any[] = [realm_id];
        
        if (dimension){
            query += 'AND dimension = $2';
            params.push(dimension);
        }
        const result = await pool.query(query, params);
        res.json(result.rows)
    } catch(err){
        console.error(err);
        res.status(500).json({error: 'server error'});
    }
});

// POST/api/waypoints   
router.post('/', authenticateToken, async(req:AuthRequest, res:Response) => {
    const {realm_id, name, x, y, z, dimension, description} = req.body;
    const userID = req.user!.id;

    if (!realm_id || !name || x == undefined || y == undefined || z == undefined || !dimension){
        return res.status(400)
    }
    
    try{
        const result = await pool.query(
            `INSERT INTO waypoints (realm_id, created_by, name, x, y, z, dimension, description)
            VALUES($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [realm_id, userID, name, x, y, z, dimension, description || null]);
            res.status(201).json(result.rows[0]);
    }catch(err){
        console.error(err);
        res.status(500).json({error: 'server error'});
    }
});

// PUT/api/waypoint
router.put('/:id', authenticateToken, async(req:AuthRequest, res: Response) => {
    const {id} = req.params;
    const{name, x, y, z, dimension, description} = req.body;
    const userID = req.user!.id

    try{
        const existing = await pool.query('SELECT * FROM waypoints WHERE id = $1', [id]);

        if(existing.rows.length === 0){
            return res.status(404).json({error: 'Waypoint not found'});
        }
        if(existing.rows[0].created_by !== userID){
            return res.status(403).json({error: 'Not authorized to edit this waypoint'});
        }
        const result = await pool.query(
            `UPDATE waypoints
            SET name = $1, x = $2, y = $3, z = $4, dimension = $5, description = $6
            WHERE id = $7
            RETURNING *`,
            [name, x, y, z, dimension, description || null, id]
        );
        res.json(result.rows[0]);
    }catch(err){
        console.error(err);
        res.status(500).json({error: 'server erorr'});
    }
});

// DELETE/api/waypoints/:id
router.delete('/:id', authenticateToken, async(req: AuthRequest, res: Response) => {
    const {id} = req.params;
    const userID = req.user!.id
    
    try{
        const existing = await pool.query('SELECT * FROM waypoints WHERE id = $1', [id]);
        
        if(existing.rows.length === 0){
            return res.status(404).json({error: 'wwaypoint not found'});
        }

        if(existing.rows[0].created_by !== userID){
            return res.status(403).json({error: 'Not authorized to delete this waypoint'});
        }

        await pool.query('DELETE FROM waypoints WHERE id = $1', [id]);
        res.json({message: 'waypoint deleted'});
    }catch(err){
        console.error(err);
        res.status(500).json({error: 'server error'});
    }
});
