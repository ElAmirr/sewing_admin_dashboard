import { metadataRepository } from "../repositories/MetadataRepository.js";

/* ---------------- OPERATORS ---------------- */

export const getOperators = async (req, res) => {
    try {
        const operators = await metadataRepository.getOperators();
        res.json(operators);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch operators" });
    }
};

export const addOperator = async (req, res) => {
    try {
        const { operator_id, name, badge } = req.body;
        if (!operator_id || !name) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const operators = await metadataRepository.getOperators();
        if (operators.some(o => o.operator_id === operator_id)) {
            return res.status(400).json({ error: "Operator ID already exists" });
        }
        const newOp = { ...req.body };
        operators.push(newOp);
        await metadataRepository.saveOperators(operators);
        res.status(201).json(newOp);
    } catch (e) {
        res.status(500).json({ error: "Failed to add operator" });
    }
};

export const deleteOperator = async (req, res) => {
    try {
        const { id } = req.params;
        const operators = await metadataRepository.getOperators();
        const filtered = operators.filter(o => String(o.operator_id) !== String(id));
        if (filtered.length === operators.length) {
            return res.status(404).json({ error: "Operator not found" });
        }
        await metadataRepository.saveOperators(filtered);
        res.status(200).json({ message: "Operator deleted" });
    } catch (e) {
        res.status(500).json({ error: "Failed to delete operator" });
    }
};

/* ---------------- SUPERVISORS ---------------- */

export const getSupervisors = async (req, res) => {
    try {
        const supervisors = await metadataRepository.getSupervisors();
        res.json(supervisors);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch supervisors" });
    }
};

export const addSupervisor = async (req, res) => {
    try {
        const { supervisor_id, supervisor_name } = req.body;
        if (!supervisor_id || !supervisor_name) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const supervisors = await metadataRepository.getSupervisors();
        if (supervisors.some(s => s.supervisor_id === supervisor_id)) {
            return res.status(400).json({ error: "Supervisor ID already exists" });
        }
        const newSup = { ...req.body };
        supervisors.push(newSup);
        await metadataRepository.saveSupervisors(supervisors);
        res.status(201).json(newSup);
    } catch (e) {
        res.status(500).json({ error: "Failed to add supervisor" });
    }
};

export const deleteSupervisor = async (req, res) => {
    try {
        const { id } = req.params;
        const supervisors = await metadataRepository.getSupervisors();
        const filtered = supervisors.filter(s => String(s.supervisor_id) !== String(id));
        if (filtered.length === supervisors.length) {
            return res.status(404).json({ error: "Supervisor not found" });
        }
        await metadataRepository.saveSupervisors(filtered);
        res.status(200).json({ message: "Supervisor deleted" });
    } catch (e) {
        res.status(500).json({ error: "Failed to delete supervisor" });
    }
};

/* ---------------- MACHINES ---------------- */

export const getMachines = async (req, res) => {
    try {
        const machines = await metadataRepository.getMachines();
        res.json(machines);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch machines" });
    }
};

export const addMachine = async (req, res) => {
    try {
        const { machine_id, code } = req.body;
        if (!machine_id || !code) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const machines = await metadataRepository.getMachines();
        if (machines.some(m => m.machine_id === machine_id)) {
            return res.status(400).json({ error: "Machine ID already exists" });
        }
        const newMachine = { ...req.body };
        machines.push(newMachine);
        await metadataRepository.saveMachines(machines);
        res.status(201).json(newMachine);
    } catch (e) {
        res.status(500).json({ error: "Failed to add machine" });
    }
};

export const deleteMachine = async (req, res) => {
    try {
        const { id } = req.params;
        const machines = await metadataRepository.getMachines();
        const filtered = machines.filter(m => String(m.machine_id) !== String(id));
        if (filtered.length === machines.length) {
            return res.status(404).json({ error: "Machine not found" });
        }
        await metadataRepository.saveMachines(filtered);
        res.status(200).json({ message: "Machine deleted" });
    } catch (e) {
        res.status(500).json({ error: "Failed to delete machine" });
    }
};

/* ---------------- UPDATE OPERATIONS ---------------- */

export const updateOperator = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, badge } = req.body;
        const operators = await metadataRepository.getOperators();
        const index = operators.findIndex(o => String(o.operator_id) === String(id));

        if (index === -1) {
            return res.status(404).json({ error: "Operator not found" });
        }

        operators[index] = { ...operators[index], name, badge };
        await metadataRepository.saveOperators(operators);
        res.status(200).json(operators[index]);
    } catch (e) {
        res.status(500).json({ error: "Failed to update operator" });
    }
};

export const updateSupervisor = async (req, res) => {
    try {
        const { id } = req.params;
        const { supervisor_name, badge } = req.body;
        const supervisors = await metadataRepository.getSupervisors();
        const index = supervisors.findIndex(s => String(s.supervisor_id) === String(id));

        if (index === -1) {
            return res.status(404).json({ error: "Supervisor not found" });
        }

        supervisors[index] = { ...supervisors[index], supervisor_name, badge };
        await metadataRepository.saveSupervisors(supervisors);
        res.status(200).json(supervisors[index]);
    } catch (e) {
        res.status(500).json({ error: "Failed to update supervisor" });
    }
};

export const updateMachine = async (req, res) => {
    try {
        const { id } = req.params;
        const { code } = req.body;
        const machines = await metadataRepository.getMachines();
        const index = machines.findIndex(m => String(m.machine_id) === String(id));

        if (index === -1) {
            return res.status(404).json({ error: "Machine not found" });
        }

        machines[index] = { ...machines[index], code };
        await metadataRepository.saveMachines(machines);
        res.status(200).json(machines[index]);
    } catch (e) {
        res.status(500).json({ error: "Failed to update machine" });
    }
};
