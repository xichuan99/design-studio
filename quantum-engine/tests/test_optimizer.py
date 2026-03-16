import pytest
from app.schemas.layout import LayoutRequest, LayoutElement
from app.services.qubo_builder import QUBOBuilder
from app.services.optimizer import QuantumOptimizer

def test_qubo_builder_no_overlap():
    request = LayoutRequest(
        canvas_width=1000,
        canvas_height=1000,
        elements=[
            LayoutElement(role="headline", width=200, height=100, pinned=False),
            LayoutElement(role="cta", width=100, height=50, pinned=False)
        ]
    )
    builder = QUBOBuilder(request, grid_size=3)
    Q, positions = builder.build_matrix()
    
    assert len(positions) == 9
    assert len(Q) > 0

def test_optimizer_fallback_execution():
    request = LayoutRequest(
        canvas_width=1000,
        canvas_height=1000,
        elements=[
            LayoutElement(role="headline", width=200, height=100, pinned=False),
            LayoutElement(role="product", width=400, height=400, pinned=True, x=500, y=500),
            LayoutElement(role="cta", width=100, height=50, pinned=False)
        ],
        num_variations=2
    )
    optimizer = QuantumOptimizer(request)
    
    variations, energy, time_ms = optimizer.optimize()
    
    assert len(variations) == 2
    for pos_list in variations:
        assert len(pos_list) == 2  # Only unpinned elements are optimized and returned
        roles = [p.role for p in pos_list]
        assert "headline" in roles
        assert "cta" in roles
        # Ensure returned positions are strictly within canvas
        for p in pos_list:
            assert 0 <= p.x <= 1000
            assert 0 <= p.y <= 1000
