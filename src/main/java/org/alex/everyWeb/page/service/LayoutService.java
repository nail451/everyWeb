package org.alex.everyWeb.page.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.alex.everyWeb.modules.entity.ModuleEntity;
import org.alex.everyWeb.modules.repository.DTO.ModuleResponseDTO;
import org.alex.everyWeb.modules.service.ModulesService;
import org.alex.everyWeb.page.dto.WidgetDTO;
import org.alex.everyWeb.page.entity.Page;
import org.alex.everyWeb.page.entity.PageLayout;
import org.alex.everyWeb.page.repository.PageLayoutRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional
public class LayoutService {

    @Autowired
    private PageLayoutRepository pageLayoutRepository;

    @Autowired
    private PageService pageService;

    @Autowired
    private ModulesService modulesService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final int GRID_ROWS = 4;
    private static final int GRID_COLS = 4;

    public PageLayout getLayout(Long pageId) {
        return pageLayoutRepository.findByPageId(pageId)
                .orElseGet(() -> createDefaultLayout(pageId));
    }

    private PageLayout createDefaultLayout(Long pageId) {
        Page page = pageService.getPageById(pageId);
        PageLayout layout = new PageLayout();
        layout.setPage(page);
        layout.setGridRows(GRID_ROWS);
        layout.setGridCols(GRID_COLS);
        layout.setWidgetsLayout("[]");
        layout.setIsEditing(false);
        return pageLayoutRepository.save(layout);
    }

    public List<WidgetDTO> getWidgets(Long pageId) {
        PageLayout layout = getLayout(pageId);
        try {
            List<WidgetDTO> widgets = objectMapper.readValue(layout.getWidgetsLayout(),
                    new TypeReference<List<WidgetDTO>>() {});
            return widgets != null ? widgets : new ArrayList<>();
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public void saveWidgets(Long pageId, List<WidgetDTO> widgets) {
        PageLayout layout = getLayout(pageId);
        try {
            layout.setWidgetsLayout(objectMapper.writeValueAsString(widgets));
            pageLayoutRepository.save(layout);
        } catch (Exception e) {
            throw new RuntimeException("Error saving widgets layout", e);
        }
    }

    public WidgetDTO addWidget(Long pageId, String type, String title, Integer rowSpan, Integer colSpan) {
        List<WidgetDTO> widgets = getWidgets(pageId);

        int[] defaultSize = WidgetDTO.getDefaultSize(type);
        int rs = rowSpan != null ? rowSpan : defaultSize[0];
        int cs = colSpan != null ? colSpan : defaultSize[1];

        int[] position = findFreePosition(widgets, rs, cs);

        // ===== СОЗДАЕМ МОДУЛЬ В БАЗЕ ДАННЫХ =====
        ModuleResponseDTO moduleResponse = modulesService.addModule(
                pageId,
                type,
                title != null ? title : type,
                "{}",
                true
        );

        // Используем ID созданного модуля как ID виджета
        WidgetDTO widget = new WidgetDTO();
        widget.setId(String.valueOf(moduleResponse.getId()));  // ← Берем ID из DTO
        widget.setType(type);
        widget.setTitle(title != null ? title : type);
        widget.setRow(position[0]);
        widget.setCol(position[1]);
        widget.setRowSpan(rs);
        widget.setColSpan(cs);
        widget.setData("");
        widget.setSettings("{}");

        widgets.add(widget);
        saveWidgets(pageId, widgets);
        return widget;
    }

    private int[] findFreePosition(List<WidgetDTO> widgets, int rowSpan, int colSpan) {
        boolean[][] occupied = new boolean[GRID_ROWS][GRID_COLS];

        for (WidgetDTO w : widgets) {
            for (int r = w.getRow(); r < w.getRow() + w.getRowSpan() && r < GRID_ROWS; r++) {
                for (int c = w.getCol(); c < w.getCol() + w.getColSpan() && c < GRID_COLS; c++) {
                    occupied[r][c] = true;
                }
            }
        }

        for (int r = 0; r <= GRID_ROWS - rowSpan; r++) {
            for (int c = 0; c <= GRID_COLS - colSpan; c++) {
                boolean free = true;
                for (int dr = 0; dr < rowSpan; dr++) {
                    for (int dc = 0; dc < colSpan; dc++) {
                        if (occupied[r + dr][c + dc]) {
                            free = false;
                            break;
                        }
                    }
                    if (!free) break;
                }
                if (free) {
                    return new int[]{r, c};
                }
            }
        }

        return new int[]{Math.max(0, GRID_ROWS - rowSpan), Math.max(0, GRID_COLS - colSpan)};
    }

    public void removeWidget(Long pageId, String widgetId) {
        List<WidgetDTO> widgets = getWidgets(pageId);

        // Удаляем модуль из базы данных
        try {
            Long moduleId = Long.parseLong(widgetId);
            modulesService.deleteModule(moduleId);
        } catch (NumberFormatException e) {
            // Если ID не число - просто удаляем из виджетов
        }

        widgets.removeIf(w -> w.getId().equals(widgetId));
        saveWidgets(pageId, widgets);
    }

    public void updateWidgetPosition(Long pageId, String widgetId, Integer row, Integer col) {
        List<WidgetDTO> widgets = getWidgets(pageId);
        for (WidgetDTO widget : widgets) {
            if (widget.getId().equals(widgetId)) {
                widget.setRow(row);
                widget.setCol(col);
                break;
            }
        }
        saveWidgets(pageId, widgets);
    }

    public void toggleEditMode(Long pageId) {
        PageLayout layout = getLayout(pageId);
        layout.setIsEditing(!layout.getIsEditing());
        pageLayoutRepository.save(layout);
    }
}