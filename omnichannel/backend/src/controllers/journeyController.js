/**
 * Customer Journey Controller
 */

import * as journeyService from "../services/journeyService.js";

export const getJourney = async (req, res) => {
    const { organization_id } = req.user;
    const { contactId } = req.params;

    try {
        const journey = await journeyService.getCustomerJourney(organization_id, parseInt(contactId));
        if (!journey) {
            return res.status(404).json({ error: 'Journey not found' });
        }
        res.json(journey);
    } catch (error) {
        console.error('[Journey] Get error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getTimeline = async (req, res) => {
    const { organization_id } = req.user;
    const { contactId } = req.params;

    try {
        const timeline = await journeyService.getJourneyTimeline(organization_id, parseInt(contactId));
        res.json(timeline);
    } catch (error) {
        console.error('[Journey] Timeline error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const recordTouchpoint = async (req, res) => {
    const { organization_id } = req.user;
    const { contactId } = req.params;
    const { touchpointType, touchpointChannel, interactionType, contentPreview, utmSource, utmMedium, utmCampaign, metadata } = req.body;

    try {
        const touchpoint = await journeyService.recordTouchpoint(organization_id, parseInt(contactId), {
            touchpointType,
            touchpointChannel,
            interactionType,
            contentPreview,
            utmSource,
            utmMedium,
            utmCampaign,
            metadata
        });

        if (!touchpoint) {
            return res.status(500).json({ error: 'Failed to record touchpoint' });
        }

        res.json(touchpoint);
    } catch (error) {
        console.error('[Journey] Record error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const markConverted = async (req, res) => {
    const { organization_id } = req.user;
    const { contactId } = req.params;
    const { conversionType, conversionValue, note } = req.body;

    try {
        const success = await journeyService.markJourneyConverted(
            organization_id,
            parseInt(contactId),
            conversionType,
            conversionValue,
            note
        );

        if (!success) {
            return res.status(500).json({ error: 'Failed to mark as converted' });
        }

        res.json({ message: 'Journey marked as converted' });
    } catch (error) {
        console.error('[Journey] Convert error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getJourneyAnalytics = async (req, res) => {
    const { organization_id } = req.user;
    const { startDate, endDate } = req.query;

    try {
        const analytics = await journeyService.getJourneyAnalytics(organization_id, {
            startDate,
            endDate
        });
        res.json(analytics);
    } catch (error) {
        console.error('[Journey] Analytics error:', error);
        res.status(500).json({ error: error.message });
    }
};