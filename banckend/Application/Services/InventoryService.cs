using Application.DTOs.Inventory;
using Domain.Inventory;
using Infrastructure.Repositories.Interfaces;
using Microsoft.Extensions.Logging;

namespace Application.Services;

public interface IInventoryService
{
    // Categories
    Task<IReadOnlyList<InventoryCategoryDto>> GetAllCategoriesAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<InventoryCategoryDto?> GetCategoryByIdAsync(Guid tenantId, Guid categoryId, CancellationToken cancellationToken = default);
    Task<InventoryCategoryDto> CreateCategoryAsync(Guid tenantId, CreateInventoryCategoryRequest request, CancellationToken cancellationToken = default);
    Task<InventoryCategoryDto> UpdateCategoryAsync(Guid tenantId, Guid categoryId, UpdateInventoryCategoryRequest request, CancellationToken cancellationToken = default);
    Task DeleteCategoryAsync(Guid tenantId, Guid categoryId, CancellationToken cancellationToken = default);

    // Items
    Task<IReadOnlyList<InventoryItemDto>> GetAllItemsAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<InventoryItemDto?> GetItemByIdAsync(Guid tenantId, Guid itemId, CancellationToken cancellationToken = default);
    Task<InventoryItemDto> CreateItemAsync(Guid tenantId, CreateInventoryItemRequest request, CancellationToken cancellationToken = default);
    Task<InventoryItemDto> UpdateItemAsync(Guid tenantId, Guid itemId, UpdateInventoryItemRequest request, CancellationToken cancellationToken = default);
    Task DeleteItemAsync(Guid tenantId, Guid itemId, CancellationToken cancellationToken = default);

    // Procurements
    Task<IReadOnlyList<InventoryProcurementOrderDto>> GetAllProcurementsAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InventoryProcurementOrderDto>> GetOpenProcurementsAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<InventoryProcurementOrderDto?> GetProcurementByIdAsync(Guid tenantId, Guid procurementId, CancellationToken cancellationToken = default);
    Task<InventoryProcurementOrderDto> CreateProcurementAsync(Guid tenantId, CreateInventoryProcurementOrderRequest request, CancellationToken cancellationToken = default);
    Task<InventoryProcurementOrderDto> UpdateProcurementAsync(Guid tenantId, Guid procurementId, UpdateInventoryProcurementOrderRequest request, CancellationToken cancellationToken = default);
    Task DeleteProcurementAsync(Guid tenantId, Guid procurementId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InventoryReplenishmentRecommendationDto>> GetReplenishmentRecommendationsAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<InventoryProcurementOrderDto> CreateRecommendedProcurementDraftAsync(Guid tenantId, Guid itemId, CancellationToken cancellationToken = default);
}

public class InventoryService : IInventoryService
{
    private readonly IInventoryCategoryRepository _categoryRepository;
    private readonly IInventoryItemRepository _itemRepository;
    private readonly IInventoryProcurementOrderRepository _procurementRepository;
    private readonly ILogger<InventoryService> _logger;

    public InventoryService(
        IInventoryCategoryRepository categoryRepository,
        IInventoryItemRepository itemRepository,
        IInventoryProcurementOrderRepository procurementRepository,
        ILogger<InventoryService> logger)
    {
        _categoryRepository = categoryRepository;
        _itemRepository = itemRepository;
        _procurementRepository = procurementRepository;
        _logger = logger;
    }

    // Category methods
    public async Task<IReadOnlyList<InventoryCategoryDto>> GetAllCategoriesAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var categories = await _categoryRepository.GetAllAsync(tenantId, cancellationToken: cancellationToken);
        return categories.Select(MapCategoryToDto).ToList();
    }

    public async Task<InventoryCategoryDto?> GetCategoryByIdAsync(
        Guid tenantId,
        Guid categoryId,
        CancellationToken cancellationToken = default)
    {
        var category = await _categoryRepository.GetByIdAsync(tenantId, categoryId, includeParameters: true, cancellationToken);
        return category is null ? null : MapCategoryToDto(category);
    }

    public async Task<InventoryCategoryDto> CreateCategoryAsync(
        Guid tenantId,
        CreateInventoryCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var category = new InventoryCategory
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = request.Name,
            Code = request.Code,
            Domain = Enum.Parse<InventoryDomain>(request.Domain),
            Description = request.Description,
            DefaultSupplier = request.DefaultSupplier,
            LinkedDepartmentId = request.LinkedDepartmentId,
            IsActive = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        foreach (var param in request.ParameterTemplates)
        {
            category.Parameters.Add(new InventoryCategoryParameter
            {
                Id = Guid.NewGuid(),
                Name = param.Name,
                Code = param.Code,
                Type = (InventoryParameterType)param.Type,
                Unit = param.Unit,
                Required = param.Required,
                Options = param.Options is not null ? string.Join(",", param.Options) : null,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            });
        }

        await _categoryRepository.AddAsync(category, cancellationToken);
        _logger.LogInformation("Created inventory category {CategoryId} in tenant {TenantId}", category.Id, tenantId);
        return MapCategoryToDto(category);
    }

    public async Task<InventoryCategoryDto> UpdateCategoryAsync(
        Guid tenantId,
        Guid categoryId,
        UpdateInventoryCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        var category = await _categoryRepository.GetByIdAsync(tenantId, categoryId, includeParameters: true, cancellationToken);
        if (category is null)
            throw new InvalidOperationException($"Category {categoryId} not found");

        category.Name = request.Name;
        category.Description = request.Description;
        category.DefaultSupplier = request.DefaultSupplier;
        category.LinkedDepartmentId = request.LinkedDepartmentId;
        category.UpdatedAtUtc = DateTime.UtcNow;

        await _categoryRepository.UpdateAsync(category, cancellationToken);
        return MapCategoryToDto(category);
    }

    public async Task DeleteCategoryAsync(
        Guid tenantId,
        Guid categoryId,
        CancellationToken cancellationToken = default)
    {
        var category = await _categoryRepository.GetByIdAsync(tenantId, categoryId, cancellationToken: cancellationToken);
        if (category is null)
            throw new InvalidOperationException($"Category {categoryId} not found");

        await _categoryRepository.RemoveAsync(category, cancellationToken);
        _logger.LogInformation("Deleted inventory category {CategoryId} from tenant {TenantId}", categoryId, tenantId);
    }

    // Item methods
    public async Task<IReadOnlyList<InventoryItemDto>> GetAllItemsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var items = await _itemRepository.GetAllAsync(tenantId, cancellationToken: cancellationToken);
        return items.Select(MapItemToDto).ToList();
    }

    public async Task<InventoryItemDto?> GetItemByIdAsync(
        Guid tenantId,
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        var item = await _itemRepository.GetByIdAsync(tenantId, itemId, includeParameters: true, includeCategory: true, cancellationToken);
        return item is null ? null : MapItemToDto(item);
    }

    public async Task<InventoryItemDto> CreateItemAsync(
        Guid tenantId,
        CreateInventoryItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var item = new InventoryItem
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CategoryId = request.CategoryId,
            Name = request.Name,
            SKU = request.SKU,
            Unit = request.Unit,
            QuantityOnHand = request.QuantityOnHand,
            QuantityReserved = request.QuantityReserved,
            MinimumStock = request.MinimumStock,
            ReorderQuantity = request.ReorderQuantity,
            LeadTimeDays = request.LeadTimeDays,
            Location = request.Location,
            SupplierName = request.SupplierName,
            UnitCost = request.UnitCost,
            LinkedDepartmentId = request.LinkedDepartmentId,
            LinkedAssetId = request.LinkedAssetId,
            LinkedAssetCategoryId = request.LinkedAssetCategoryId,
            Criticality = (InventoryCriticality)request.Criticality,
            ServiceType = request.ServiceType.HasValue ? (InventoryServiceType)request.ServiceType.Value : null,
            IsActive = true,
            Notes = request.Notes,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        if (request.ParameterValues.Count > 0)
        {
            var category = await _categoryRepository.GetByIdAsync(tenantId, request.CategoryId, includeParameters: true, cancellationToken);
            if (category is not null)
            {
                foreach (var param in category.Parameters)
                {
                    if (request.ParameterValues.TryGetValue(param.Id.ToString(), out var value))
                    {
                        item.ParameterValues.Add(new InventoryItemParameter
                        {
                            Id = Guid.NewGuid(),
                            ParameterDefinitionId = param.Id,
                            Value = value,
                            CreatedAtUtc = now,
                            UpdatedAtUtc = now
                        });
                    }
                }
            }
        }

        await _itemRepository.AddAsync(item, cancellationToken);
        _logger.LogInformation("Created inventory item {ItemId} in tenant {TenantId}", item.Id, tenantId);
        return MapItemToDto(item);
    }

    public async Task<InventoryItemDto> UpdateItemAsync(
        Guid tenantId,
        Guid itemId,
        UpdateInventoryItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var item = await _itemRepository.GetByIdAsync(tenantId, itemId, includeParameters: true, cancellationToken: cancellationToken);
        if (item is null)
            throw new InvalidOperationException($"Item {itemId} not found");

        item.Name = request.Name;
        item.QuantityOnHand = request.QuantityOnHand;
        item.QuantityReserved = request.QuantityReserved;
        item.MinimumStock = request.MinimumStock;
        item.ReorderQuantity = request.ReorderQuantity;
        item.LeadTimeDays = request.LeadTimeDays;
        item.Location = request.Location;
        item.SupplierName = request.SupplierName;
        item.UnitCost = request.UnitCost;
        item.LinkedDepartmentId = request.LinkedDepartmentId;
        item.LinkedAssetId = request.LinkedAssetId;
        item.Criticality = (InventoryCriticality)request.Criticality;
        item.ServiceType = request.ServiceType.HasValue ? (InventoryServiceType)request.ServiceType.Value : null;
        item.IsActive = request.IsActive;
        item.Notes = request.Notes;
        item.UpdatedAtUtc = DateTime.UtcNow;

        await _itemRepository.UpdateAsync(item, cancellationToken);
        return MapItemToDto(item);
    }

    public async Task DeleteItemAsync(
        Guid tenantId,
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        var item = await _itemRepository.GetByIdAsync(tenantId, itemId, cancellationToken: cancellationToken);
        if (item is null)
            throw new InvalidOperationException($"Item {itemId} not found");

        await _itemRepository.RemoveAsync(item, cancellationToken);
        _logger.LogInformation("Deleted inventory item {ItemId} from tenant {TenantId}", itemId, tenantId);
    }

    // Procurement methods
    public async Task<IReadOnlyList<InventoryProcurementOrderDto>> GetAllProcurementsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var procurements = await _procurementRepository.GetAllAsync(tenantId, cancellationToken);
        return procurements.Select(MapProcurementToDto).ToList();
    }

    public async Task<IReadOnlyList<InventoryProcurementOrderDto>> GetOpenProcurementsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var procurements = await _procurementRepository.GetOpenAsync(tenantId, cancellationToken);
        return procurements.Select(MapProcurementToDto).ToList();
    }

    public async Task<InventoryProcurementOrderDto?> GetProcurementByIdAsync(
        Guid tenantId,
        Guid procurementId,
        CancellationToken cancellationToken = default)
    {
        var procurement = await _procurementRepository.GetByIdAsync(tenantId, procurementId, cancellationToken);
        return procurement is null ? null : MapProcurementToDto(procurement);
    }

    public async Task<InventoryProcurementOrderDto> CreateProcurementAsync(
        Guid tenantId,
        CreateInventoryProcurementOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var procurement = new InventoryProcurementOrder
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            InventoryItemId = request.InventoryItemId,
            Quantity = request.Quantity,
            Status = InventoryProcurementStatus.Draft,
            SupplierName = request.SupplierName,
            RequestedByDepartmentId = request.RequestedByDepartmentId,
            LinkedWorkOrderId = request.LinkedWorkOrderId,
            LinkedMaintenancePlanId = request.LinkedMaintenancePlanId,
            RequestedAtUtc = now,
            ExpectedDeliveryAtUtc = request.ExpectedDeliveryAtUtc,
            Notes = request.Notes,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        await _procurementRepository.AddAsync(procurement, cancellationToken);
        _logger.LogInformation("Created inventory procurement {ProcurementId} in tenant {TenantId}", procurement.Id, tenantId);
        return MapProcurementToDto(procurement);
    }

    public async Task<InventoryProcurementOrderDto> UpdateProcurementAsync(
        Guid tenantId,
        Guid procurementId,
        UpdateInventoryProcurementOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        var procurement = await _procurementRepository.GetByIdAsync(tenantId, procurementId, cancellationToken);
        if (procurement is null)
            throw new InvalidOperationException($"Procurement {procurementId} not found");

        procurement.Status = (InventoryProcurementStatus)request.Status;
        procurement.SupplierName = request.SupplierName;
        procurement.ExpectedDeliveryAtUtc = request.ExpectedDeliveryAtUtc;
        procurement.ReceivedAtUtc = request.ReceivedAtUtc;
        procurement.Notes = request.Notes;
        procurement.UpdatedAtUtc = DateTime.UtcNow;

        await _procurementRepository.UpdateAsync(procurement, cancellationToken);
        return MapProcurementToDto(procurement);
    }

    public async Task DeleteProcurementAsync(
        Guid tenantId,
        Guid procurementId,
        CancellationToken cancellationToken = default)
    {
        var procurement = await _procurementRepository.GetByIdAsync(tenantId, procurementId, cancellationToken);
        if (procurement is null)
            throw new InvalidOperationException($"Procurement {procurementId} not found");

        await _procurementRepository.RemoveAsync(procurement, cancellationToken);
        _logger.LogInformation("Deleted inventory procurement {ProcurementId} from tenant {TenantId}", procurementId, tenantId);
    }

    public async Task<IReadOnlyList<InventoryReplenishmentRecommendationDto>> GetReplenishmentRecommendationsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var items = await _itemRepository.GetAllAsync(tenantId, cancellationToken: cancellationToken);
        var categories = await _categoryRepository.GetAllAsync(tenantId, cancellationToken: cancellationToken);
        var openProcurements = await _procurementRepository.GetOpenAsync(tenantId, cancellationToken);

        var categoriesById = categories.ToDictionary(category => category.Id);
        var procurementsByItemId = openProcurements
            .GroupBy(procurement => procurement.InventoryItemId)
            .ToDictionary(group => group.Key, group => (IReadOnlyList<InventoryProcurementOrder>)group.ToList());

        var recommendations = new List<InventoryReplenishmentRecommendationDto>();

        foreach (var item in items.Where(item => item.IsActive))
        {
            if (!categoriesById.TryGetValue(item.CategoryId, out var category))
            {
                continue;
            }

            procurementsByItemId.TryGetValue(item.Id, out var itemProcurements);
            var recommendation = BuildReplenishmentRecommendation(
                item,
                category,
                itemProcurements ?? Array.Empty<InventoryProcurementOrder>());

            if (recommendation is not null)
            {
                recommendations.Add(recommendation);
            }
        }

        return recommendations
            .OrderBy(recommendation => RecommendationUrgencyRank(recommendation.Urgency))
            .ThenByDescending(recommendation => recommendation.ShortageQuantity)
            .ThenBy(recommendation => recommendation.ItemName)
            .ToList();
    }

    public async Task<InventoryProcurementOrderDto> CreateRecommendedProcurementDraftAsync(
        Guid tenantId,
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        var item = await _itemRepository.GetByIdAsync(
            tenantId,
            itemId,
            includeCategory: true,
            cancellationToken: cancellationToken);

        if (item is null)
        {
            throw new KeyNotFoundException($"Item {itemId} not found");
        }

        var openProcurements = await _procurementRepository.GetByItemAsync(tenantId, itemId, cancellationToken);
        var activeOpenProcurements = openProcurements
            .Where(procurement => procurement.Status != InventoryProcurementStatus.Received)
            .ToList();

        var recommendation = BuildReplenishmentRecommendation(
            item,
            item.Category,
            activeOpenProcurements);

        if (recommendation is null || recommendation.SuggestedQuantity <= 0)
        {
            throw new InvalidOperationException("Ta pozycja nie wymaga teraz nowego projektu zakupu.");
        }

        if (!string.Equals(recommendation.RecommendedAction, "create-procurement-draft", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Ta pozycja ma juz otwarte zaopatrzenie albo wymaga tylko monitorowania dostawy.");
        }

        var now = DateTime.UtcNow;
        var procurement = new InventoryProcurementOrder
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            InventoryItemId = item.Id,
            Quantity = recommendation.SuggestedQuantity,
            Status = InventoryProcurementStatus.Draft,
            SupplierName = item.SupplierName ?? item.Category.DefaultSupplier,
            RequestedByDepartmentId = item.LinkedDepartmentId,
            RequestedAtUtc = now,
            ExpectedDeliveryAtUtc = now.Date.AddDays(Math.Max(item.LeadTimeDays, 1)),
            Notes = $"Projekt utworzony automatycznie z kolejki uzupelnienia. {recommendation.Reason}",
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        await _procurementRepository.AddAsync(procurement, cancellationToken);
        _logger.LogInformation(
            "Created recommended inventory procurement draft {ProcurementId} for item {ItemId} in tenant {TenantId}",
            procurement.Id,
            item.Id,
            tenantId);

        return MapProcurementToDto(procurement);
    }

    // Mapping helpers
    private static InventoryReplenishmentRecommendationDto? BuildReplenishmentRecommendation(
        InventoryItem item,
        InventoryCategory category,
        IReadOnlyList<InventoryProcurementOrder> openProcurements)
    {
        var availableQuantity = Math.Max(0m, item.QuantityOnHand - item.QuantityReserved);
        var openProcurementQuantity = openProcurements.Sum(procurement => procurement.Quantity);
        var projectedQuantity = availableQuantity + openProcurementQuantity;
        var directShortage = Math.Max(0m, item.MinimumStock - availableQuantity);
        var projectedShortage = Math.Max(0m, item.MinimumStock - projectedQuantity);
        var overdueProcurement = openProcurements
            .Where(procurement => procurement.ExpectedDeliveryAtUtc.HasValue && procurement.ExpectedDeliveryAtUtc.Value.Date < DateTime.UtcNow.Date)
            .OrderBy(procurement => procurement.ExpectedDeliveryAtUtc)
            .FirstOrDefault();
        var nextExpectedDeliveryAtUtc = openProcurements
            .Where(procurement => procurement.ExpectedDeliveryAtUtc.HasValue)
            .Select(procurement => procurement.ExpectedDeliveryAtUtc)
            .OrderBy(date => date)
            .FirstOrDefault();

        var reasonParts = new List<string>();

        if (directShortage > 0)
        {
            reasonParts.Add($"dostepne {availableQuantity:0.##} / minimum {item.MinimumStock:0.##}");
        }

        if (projectedShortage > 0 && openProcurementQuantity > 0)
        {
            reasonParts.Add($"otwarte dostawy {openProcurementQuantity:0.##} {item.Unit} nie zamykaja zapotrzebowania");
        }

        if (overdueProcurement is not null)
        {
            reasonParts.Add($"ETA minelo {overdueProcurement.ExpectedDeliveryAtUtc:yyyy-MM-dd}");
        }
        else if (openProcurements.Count > 0 && nextExpectedDeliveryAtUtc is null)
        {
            reasonParts.Add("otwarte zaopatrzenie bez ETA");
        }

        var needsAttention =
            directShortage > 0 ||
            projectedShortage > 0 ||
            overdueProcurement is not null ||
            (openProcurements.Count > 0 && nextExpectedDeliveryAtUtc is null);

        if (!needsAttention)
        {
            return null;
        }

        var suggestedQuantity = projectedShortage > 0
            ? Math.Max(projectedShortage, item.ReorderQuantity > 0 ? item.ReorderQuantity : projectedShortage)
            : 0m;

        var recommendedAction =
            projectedShortage > 0 && openProcurements.Count == 0
                ? "create-procurement-draft"
                : openProcurements.Count > 0
                    ? "expedite-open-procurement"
                    : "monitor";

        var urgency =
            item.Criticality == InventoryCriticality.High && directShortage > 0
                ? "high"
                : directShortage > 0 || overdueProcurement is not null
                    ? "medium"
                    : "low";

        return new InventoryReplenishmentRecommendationDto
        {
            ItemId = item.Id,
            CategoryId = category.Id,
            ItemName = item.Name,
            SKU = item.SKU,
            CategoryName = category.Name,
            Unit = item.Unit,
            SupplierName = item.SupplierName ?? category.DefaultSupplier,
            Criticality = item.Criticality.ToString().ToLowerInvariant(),
            QuantityOnHand = item.QuantityOnHand,
            QuantityReserved = item.QuantityReserved,
            AvailableQuantity = availableQuantity,
            MinimumStock = item.MinimumStock,
            OpenProcurementQuantity = openProcurementQuantity,
            SuggestedQuantity = suggestedQuantity,
            ShortageQuantity = projectedShortage > 0 ? projectedShortage : directShortage,
            LeadTimeDays = item.LeadTimeDays,
            HasOpenProcurement = openProcurements.Count > 0,
            OpenProcurementId = openProcurements
                .OrderBy(procurement => procurement.RequestedAtUtc)
                .Select(procurement => (Guid?)procurement.Id)
                .FirstOrDefault(),
            Urgency = urgency,
            RecommendedAction = recommendedAction,
            Reason = string.Join(" · ", reasonParts),
            NextExpectedDeliveryAtUtc = nextExpectedDeliveryAtUtc
        };
    }

    private static int RecommendationUrgencyRank(string urgency)
    {
        return urgency switch
        {
            "high" => 0,
            "medium" => 1,
            _ => 2
        };
    }

    private static InventoryCategoryDto MapCategoryToDto(InventoryCategory category)
    {
        return new InventoryCategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Code = category.Code,
            Domain = category.Domain.ToString().ToLowerInvariant(),
            Description = category.Description,
            DefaultSupplier = category.DefaultSupplier,
            LinkedDepartmentId = category.LinkedDepartmentId,
            IsActive = category.IsActive,
            ParameterTemplates = category.Parameters
                .Select(p => new InventoryCategoryParameterDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Code = p.Code,
                    Type = (InventoryParameterTypeDto)p.Type,
                    Unit = p.Unit,
                    Required = p.Required,
                    Options = string.IsNullOrEmpty(p.Options) ? null : p.Options.Split(",")
                })
                .ToList(),
            CreatedAtUtc = category.CreatedAtUtc,
            UpdatedAtUtc = category.UpdatedAtUtc
        };
    }

    private static InventoryItemDto MapItemToDto(InventoryItem item)
    {
        return new InventoryItemDto
        {
            Id = item.Id,
            CategoryId = item.CategoryId,
            Name = item.Name,
            SKU = item.SKU,
            Unit = item.Unit,
            QuantityOnHand = item.QuantityOnHand,
            QuantityReserved = item.QuantityReserved,
            MinimumStock = item.MinimumStock,
            ReorderQuantity = item.ReorderQuantity,
            LeadTimeDays = item.LeadTimeDays,
            Location = item.Location,
            SupplierName = item.SupplierName,
            UnitCost = item.UnitCost,
            LinkedDepartmentId = item.LinkedDepartmentId,
            LinkedAssetId = item.LinkedAssetId,
            LinkedAssetCategoryId = item.LinkedAssetCategoryId,
            Criticality = item.Criticality.ToString().ToLowerInvariant(),
            ServiceType = item.ServiceType?.ToString().ToLowerInvariant(),
            IsActive = item.IsActive,
            Notes = item.Notes,
            LastReceiptAtUtc = item.LastReceiptAtUtc,
            ParameterValues = item.ParameterValues
                .ToDictionary(p => p.ParameterDefinitionId.ToString(), p => p.Value),
            CreatedAtUtc = item.CreatedAtUtc,
            UpdatedAtUtc = item.UpdatedAtUtc
        };
    }

    private static InventoryProcurementOrderDto MapProcurementToDto(InventoryProcurementOrder order)
    {
        return new InventoryProcurementOrderDto
        {
            Id = order.Id,
            InventoryItemId = order.InventoryItemId,
            Quantity = order.Quantity,
            Status = order.Status.ToString().ToLowerInvariant(),
            SupplierName = order.SupplierName,
            RequestedByDepartmentId = order.RequestedByDepartmentId,
            LinkedWorkOrderId = order.LinkedWorkOrderId,
            LinkedMaintenancePlanId = order.LinkedMaintenancePlanId,
            RequestedAtUtc = order.RequestedAtUtc,
            ExpectedDeliveryAtUtc = order.ExpectedDeliveryAtUtc,
            ReceivedAtUtc = order.ReceivedAtUtc,
            Notes = order.Notes,
            CreatedAtUtc = order.CreatedAtUtc,
            UpdatedAtUtc = order.UpdatedAtUtc
        };
    }
}
