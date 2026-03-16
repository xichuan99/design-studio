import numpy as np
from typing import List, Tuple, Dict
from app.schemas.layout import LayoutRequest, LayoutElement

class QUBOBuilder:
    def __init__(self, request: LayoutRequest, grid_size: int = 4):
        self.request = request
        self.grid_size = grid_size  # e.g., 4x4 grid = 16 positions
        self.grid_w = request.canvas_width / grid_size
        self.grid_h = request.canvas_height / grid_size
        
        self.elements = request.elements
        self.unpinned_elements = [e for e in self.elements if not e.pinned]
        self.pinned_elements = [e for e in self.elements if e.pinned]
        
        # M elements, N positions => M * N binary variables
        self.M = len(self.unpinned_elements)
        self.N = grid_size * grid_size
        self.num_vars = self.M * self.N

    def _get_grid_center(self, grid_idx: int) -> Tuple[float, float]:
        """Convert 1D grid index to actual (x, y) pixel coordinate of the grid cell center."""
        row = grid_idx // self.grid_size
        col = grid_idx % self.grid_size
        x = (col * self.grid_w) + (self.grid_w / 2)
        y = (row * self.grid_h) + (self.grid_h / 2)
        return x, y

    def _check_overlap(self, x1, y1, w1, h1, x2, y2, w2, h2) -> bool:
        """Simple AABB overlap check."""
        return not (x1 + w1/2 < x2 - w2/2 or 
                    x1 - w1/2 > x2 + w2/2 or 
                    y1 + h1/2 < y2 - h2/2 or 
                    y1 - h1/2 > y2 + h2/2)

    def build_matrix(self) -> Tuple[Dict[Tuple[int, int], float], List[Tuple[float, float]]]:
        """
        Builds the QUBO dictionary suitable for pyQPanda matrix mapping.
        Returns:
            Q (dict): QUBO matrix {(i, j): weight}
            positions (list): The (x, y) candidate points
        """
        Q = {}
        positions = [self._get_grid_center(i) for i in range(self.N)]
        
        # Penalty configurations
        PENALTY_MULTI_POS = 1000.0  # Constraint: one pos per element
        PENALTY_OVERLAP = 500.0     # Constraint: no overlapping
        REWARD_GOLDEN = -50.0       # Soft constraint: prefer golden ratio

        # 1. Linear terms & One Position Constraint (Diagonal)
        for e_idx in range(self.M):
            for p_idx in range(self.N):
                var_idx = e_idx * self.N + p_idx
                # Base penalty for being selected (part of the 1-hot constraint: (sum(xi) - 1)^2 )
                # x^2 - 2x + 1 -> quadratic penalty 2x_i x_j, linear penalty -x_i
                Q[(var_idx, var_idx)] = Q.get((var_idx, var_idx), 0) - PENALTY_MULTI_POS
                
                # Soft Constraint: Golden Ratio y~0.38 or x~0.61
                px, py = positions[p_idx]
                prop_x = px / self.request.canvas_width
                prop_y = py / self.request.canvas_height
                
                if self.request.strategy == "golden_ratio":
                    # Reward positions near 0.38 or 0.61
                    dist = min(abs(prop_y - 0.38), abs(prop_y - 0.61), abs(prop_x - 0.38), abs(prop_x - 0.61))
                    if dist < 0.1:
                        Q[(var_idx, var_idx)] += REWARD_GOLDEN

        # 2. Quadratic terms: 1-hot constraint (Cross terms)
        for e_idx in range(self.M):
            for p1 in range(self.N):
                for p2 in range(p1 + 1, self.N):
                    idx1 = e_idx * self.N + p1
                    idx2 = e_idx * self.N + p2
                    # 2 * x_i * x_j term for the (sum(xi) - 1)^2 expansion
                    Q[(idx1, idx2)] = Q.get((idx1, idx2), 0) + 2 * PENALTY_MULTI_POS

        # 3. Quadratic terms: Overlap constraint
        for e1_idx in range(self.M):
            for e2_idx in range(e1_idx + 1, self.M):
                for p1 in range(self.N):
                    for p2 in range(self.N):
                        idx1 = e1_idx * self.N + p1
                        idx2 = e2_idx * self.N + p2
                        
                        el1 = self.unpinned_elements[e1_idx]
                        el2 = self.unpinned_elements[e2_idx]
                        pos1 = positions[p1]
                        pos2 = positions[p2]
                        
                        if self._check_overlap(pos1[0], pos1[1], el1.width, el1.height,
                                               pos2[0], pos2[1], el2.width, el2.height):
                            Q[(idx1, idx2)] = Q.get((idx1, idx2), 0) + PENALTY_OVERLAP

        # 4. Check overlap with pinned elements (Linear penalty)
        for e_idx in range(self.M):
            for p_idx in range(self.N):
                idx = e_idx * self.N + p_idx
                el = self.unpinned_elements[e_idx]
                pos = positions[p_idx]
                
                for pinned in self.pinned_elements:
                    if pinned.x is not None and pinned.y is not None:
                        if self._check_overlap(pos[0], pos[1], el.width, el.height,
                                               pinned.x, pinned.y, pinned.width, pinned.height):
                            Q[(idx, idx)] = Q.get((idx, idx), 0) + PENALTY_OVERLAP

        return Q, positions

    def decode_solution(self, sample: List[int], positions: List[Tuple[float, float]]) -> Dict[str, Tuple[float, float]]:
        """Decode binary result array to {role: (x, y)} map."""
        result = {}
        for e_idx in range(self.M):
            el = self.unpinned_elements[e_idx]
            assigned_pos = None
            
            # Find the position with value '1'
            for p_idx in range(self.N):
                idx = e_idx * self.N + p_idx
                if sample[idx] == 1:
                    assigned_pos = positions[p_idx]
                    break
            
            # Fallback if solver fails 1-hot constraint (very common in simulated annealing/QAOA without enough depth)
            if not assigned_pos:
                assigned_pos = positions[0] # Default
                
            result[el.role] = assigned_pos
            
        return result
